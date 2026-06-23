/**
 * Patch the singleton configurables document with autonomous chat engine
 * test values (1 ping/minute). Reads MONGODB_URI from ../.env.
 *
 * Usage: npx tsx scripts/patch-autonomous-config.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";

const ENV_PATH = resolve(import.meta.dirname ?? __dirname, "..", ".env");

function loadEnv(path: string): Record<string, string> {
  const raw = readFileSync(path, "utf-8");
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return out;
}

async function main() {
  const env = loadEnv(ENV_PATH);
  const uri = env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in .env");
    process.exit(1);
  }

  const url = new URL(uri);
  if (!url.searchParams.has("authSource")) url.searchParams.set("authSource", "admin");
  const client = new MongoClient(url.toString());
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection("tbl_app_configurables");

    const before = await col.findOne({ _singleton: true });
    if (!before) {
      console.error("No singleton configurables document found.");
      process.exit(1);
    }

    const result = await col.updateOne(
      { _singleton: true },
      {
        $set: {
          "configurable_data.chatPingsPerHour": 0.25,
          "configurable_data.chatMaxCatchUpPings": 4,
          "configurable_data.chatPollIntervalSeconds": 120,
          "configurable_data.offlinePingAfterHours": 6,
          "configurable_data.chatBackgroundAdvanceMinutes": 240,
        },
      },
    );

    console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    console.log("Patched fields:");
    console.log("  chatPingsPerHour: 0.25            (~1 ping/4h)");
    console.log("  chatMaxCatchUpPings: 4");
    console.log("  chatPollIntervalSeconds: 120       (frontend poll every 2 min)");
    console.log("  offlinePingAfterHours: 6           (catch-up after 6h away)");
    console.log("  chatBackgroundAdvanceMinutes: 240  (tick every 4 hours)");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
