// CORE: entrypoint + server wiring. Keep stack (Express+React Router) stable; extend via middleware/routes.
import "dotenv/config";
import { createRequestHandler } from "@react-router/express";
import type { ServerBuild } from "react-router";
import express from "express";
import { connectMongoDB } from "./app/lib/db.server";
import { createServer } from "node:http";
import apiRoutes from "./app/api";
import { runSeeds } from "~/api/seeds";
import crypto from "node:crypto";
import mongoose from "mongoose";
import fs from "node:fs";

const PORT = Number.parseInt(process.env.PORT || "3000");
const HOST = process.env.HOST || "0.0.0.0"; // Default to 0.0.0.0 for tunnel connectivity
const BUILD_PATH = "./build/server/index.js";
const DEVELOPMENT = process.env.NODE_ENV !== "production";

const isContainer = fs.existsSync("/.dockerenv") || fs.existsSync("/run/secrets/kubernetes.io");
const defaultPort = isContainer ? 443 : undefined;
const hmrClientPort = process.env.HMR_CLIENT_PORT
  ? Number(process.env.HMR_CLIENT_PORT)
  : defaultPort;

async function startServer() {
  // Connect to MongoDB
  try {
    await connectMongoDB();
    console.log("MongoDB connected");

    // Run all seeds
    await runSeeds();

    // Background autonomous chat tick — DB-persisted scheduling.
    // On first load: run immediately. Then every N minutes (configurable),
    // but only if the last run was long enough ago (survives restarts).
    const { ConfigurablesService } = await import("~/modules/configurables/src/services/configurables.service");
    const { defaultConfigurablesData: defaultCfg } = await import("~/modules/configurables/src/constants/configurables.default");
    const { advanceAllSessions } = await import("~/modules/agentic/chat/chat.service");
    const { AgentJobModel } = await import("~/modules/agentic/agent-job.model");
    const { ConfigurableModel } = await import("~/modules/configurables/src/models/configurables.model");

    async function getStoredTickMinutes(): Promise<number> {
      try {
        const data = (await ConfigurablesService.getData()) as Record<string, unknown>;
        if (typeof data?.chatBackgroundAdvanceMinutes === "number") {
          return data.chatBackgroundAdvanceMinutes as number;
        }
      } catch { /* use default */ }
      return defaultCfg.chatBackgroundAdvanceMinutes;
    }

    async function getLastAdvanceAt(): Promise<Date | null> {
      try {
        const data = (await ConfigurablesService.getData()) as Record<string, unknown>;
        const v = data?.chatLastBackgroundAdvanceAt;
        if (typeof v === "string" && v) return new Date(v);
      } catch { /* not yet seeded */ }
      return null;
    }

    async function persistAdvanceAt(d: Date): Promise<void> {
      await ConfigurableModel.updateOne(
        { _singleton: true },
        { $set: { "configurable_data.chatLastBackgroundAdvanceAt": d.toISOString() } },
      );
    }

    async function cleanupStalePending(): Promise<number> {
      const result = await AgentJobModel.updateMany(
        { prompt: "autonomous-chat-tick", status: "PENDING" },
        { $set: { status: "ERROR", error: "orphaned — process restart or previous crash" } },
      );
      return result.modifiedCount ?? 0;
    }

    async function tick(force = false): Promise<void> {
      // Resolve any orphaned PENDING jobs from a previous crash before starting.
      const cleaned = await cleanupStalePending();
      if (cleaned > 0) console.log(`[BackgroundTick] Cleaned up ${cleaned} stale PENDING job(s)`);

      const minutes = await getStoredTickMinutes();
      const lastAt = await getLastAdvanceAt();
      const intervalMs = minutes * 60 * 1000;

      if (!force) {
        console.log(`[BackgroundTick] Check — minutes: ${minutes}, lastAt: ${lastAt?.toISOString() ?? "never"}, intervalMs: ${intervalMs}`);

        if (lastAt && Date.now() - lastAt.getTime() < intervalMs) {
          console.log(`[BackgroundTick] Skipped — last run was ${Math.round((Date.now() - lastAt.getTime()) / 1000)}s ago, need ${intervalMs / 1000}s`);
          return;
        }
      }

      console.log("[BackgroundTick] Running autonomous advance...");

      const jobId = crypto.randomUUID();
      await AgentJobModel.create({
        jobId,
        prompt: "autonomous-chat-tick",
        status: "PENDING",
        callbackToken: crypto.randomUUID(),
      });

      try {
        const advanced = await advanceAllSessions(force);
        await AgentJobModel.updateOne(
          { jobId },
          { $set: { status: "DONE", response: { advanced, at: new Date().toISOString() } } },
        );
        await persistAdvanceAt(new Date());
        if (advanced > 0) console.log(`[BackgroundTick] Advanced ${advanced} session(s)`);
      } catch (err) {
        await AgentJobModel.updateOne(
          { jobId },
          { $set: { status: "ERROR", error: String(err) } },
        );
        throw err;
      }
    }

    // Run immediately on first load — always, regardless of lastRunAt.
    console.log("[BackgroundTick] Startup — forcing initial tick");
    await tick(true);

    // Check every 60s whether it's time. Interval ticks gate on the DB timestamp.
    const tickTimer = setInterval(() => {
      tick().catch((err) => console.error("[BackgroundTick] tick failed:", err));
    }, 60_000);
    tickTimer.unref();

    console.log("Background autonomous tick started (DB-persisted schedule)");

  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }

  const app = express();

  const httpServer = createServer(app);

  // Request logging middleware (first, to catch all requests)
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });

  // Body parser middleware - ONLY for API routes, not for Remix routes
  // Remix will handle body parsing for its own routes.
  // `verify` stashes the raw request bytes on req.rawBody so signature-verified
  // webhooks (e.g. Stripe at /api/billing/webhook) can validate against the
  // exact payload — express.json otherwise consumes the stream.
  app.use(
    "/api",
    express.json({
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use("/api", express.urlencoded({ extended: true }));

  // API Routes (before Remix handler)
  app.use("/api", (req, res, next) => {
    console.log(`[API Route] ${req.method} ${req.path}`);
    next();
  }, apiRoutes);

  // Remix handler
  if (DEVELOPMENT) {
    console.log("Starting development server with Vite");
    const vite = await import("vite");
    const viteDevServer = await vite.createServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: {
          server: httpServer,
          ...(hmrClientPort ? { clientPort: hmrClientPort } : {}),
        },
        watch: {
          usePolling: true,
          interval: 100,
        },
      },
    });
    app.use(viteDevServer.middlewares);
    app.all("*", async (req, res, next) => {
      // Skip logging for static assets and dev tools
      if (!req.path.startsWith("/.well-known") && !req.path.includes("favicon")) {
        console.log(`[Remix Handler] ${req.method} ${req.path}`);
      }
      try {
        return await createRequestHandler({
          build: await viteDevServer.ssrLoadModule("virtual:react-router/server-build") as unknown as ServerBuild,
          getLoadContext: () => ({}),
        })(req, res, next);
      } catch (error) {
        if (error instanceof Error) {
          viteDevServer.ssrFixStacktrace(error);
        }
        next(error);
      }
    });
  } else {
    console.log("Starting production server");
    app.use(express.static("build/client"));
    const build = await import(BUILD_PATH);
    app.all(
      "*",
      createRequestHandler({
        build: build as unknown as ServerBuild,
      })
    );
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully");
    await mongoose.connection.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, shutting down gracefully");
    await mongoose.connection.close();
    process.exit(0);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
