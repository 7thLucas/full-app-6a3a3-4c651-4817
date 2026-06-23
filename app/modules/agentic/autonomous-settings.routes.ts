import { Router, type Request, type Response } from "express";
import { createLogger } from "~/lib/logger";
import { resolveOwnerId } from "./chat/chat.owner";
import { getAutonomousSettings, upsertAutonomousSettings } from "./chat/autonomous-settings.service";
import type { Cadence, NotifyFrequency } from "./autonomous-settings.model";

const logger = createLogger("AutonomousSettingsRoutes");
const router = Router();
const VALID_CADENCE: Cadence[] = ["slow", "normal", "active"];
const VALID_NOTIFY: NotifyFrequency[] = ["off", "daily", "weekly"];

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}

router.get("/autonomous-settings", async (req: Request, res: Response) => {
  try {
    const ownerId = resolveOwnerId(req, res);
    const settings = await getAutonomousSettings(ownerId);
    return res.json({ success: true, data: settings });
  } catch (error) {
    logger.error("GET /autonomous-settings failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Failed to load settings");
  }
});

router.put("/autonomous-settings", async (req: Request, res: Response) => {
  try {
    const ownerId = resolveOwnerId(req, res);
    const body = req.body ?? {};

    if (body.cadence !== undefined && !VALID_CADENCE.includes(body.cadence)) {
      return fail(res, 400, "cadence must be one of: slow, normal, active");
    }
    if (body.notifyFrequency !== undefined && !VALID_NOTIFY.includes(body.notifyFrequency)) {
      return fail(res, 400, "notifyFrequency must be one of: off, daily, weekly");
    }

    const data: Record<string, unknown> = {};
    if (typeof body.tickIntervalMinutes === "number") data.tickIntervalMinutes = body.tickIntervalMinutes;
    if (typeof body.cadence === "string") data.cadence = body.cadence;
    if (typeof body.simulateUser === "boolean") data.simulateUser = body.simulateUser;
    if (typeof body.storyTone === "string") data.storyTone = body.storyTone;
    if (typeof body.personality === "string") data.personality = body.personality;
    if (typeof body.relationship === "string") data.relationship = body.relationship;
    if (typeof body.memoryDepth === "number") data.memoryDepth = body.memoryDepth;
    if (typeof body.notifyFrequency === "string") data.notifyFrequency = body.notifyFrequency;

    const settings = await upsertAutonomousSettings(ownerId, data);
    return res.json({ success: true, data: settings });
  } catch (error) {
    logger.error("PUT /autonomous-settings failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Failed to save settings");
  }
});

export default router;
