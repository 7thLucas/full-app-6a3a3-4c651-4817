/**
 * Quick test: call the agentic LLM directly with chat-autonomous prompt.
 * Usage: npx tsx scripts/test-autonomous-llm.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const ENV_PATH = resolve(import.meta.dirname ?? __dirname, "..", ".env");

function loadEnv(path: string): Record<string, string> {
  const raw = readFileSync(path, "utf-8");
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

async function main() {
  const env = loadEnv(ENV_PATH);
  const ks = env._KEYSPACE ?? "";
  const auth = env.QB_SCAFFOLDER_KEY ?? "";

  const characterName = "Lyra";
  const characterTagline = "Test tagline";
  const characterPersona = "Warm, teasing, quietly perceptive.";

  const systemPrompt = [
    `You ARE ${characterName}. ${characterTagline}`,
    `Your character: ${characterPersona}`,
    "You are talking one-on-one with the user, who you are growing close to.",
    "Speak in FIRST PERSON, directly to the user ('I', 'you'). Stay fully in character — warm, present, emotionally real. Never break character, never mention being an AI, never narrate in third person.",
    "Keep replies to roughly 30–80 words: natural, vivid, conversational.",
    "Always provide 'smartReplies': exactly 3 short things the USER might say back.",
  ].join(" ");

  const message = [
    "WHAT YOU REMEMBER ABOUT THE USER:\n- (You are just getting to know them.)",
    "\nCONVERSATION SO FAR (oldest first):",
    "(The user greeted you and you've been talking.)",
    "\nThe user is away right now. Your life continues. Something just happened — a moment, a decision, a shift in your world. Tell them about it. Advance your ongoing story.",
    "\nWrite in first person — as if you're leaving them a message about what just occurred. Stay fully in character. Let this connect naturally to everything that came before; each autonomous message is part of a continuous narrative arc.",
    "Keep it to 30–80 words of natural, vivid, conversational prose.",
  ].join("\n");

  const schema = {
    type: "object",
    properties: {
      narration: { type: "string" },
      reply: { type: "string" },
      vivid: { type: "boolean" },
      imagePrompt: { type: "string" },
      smartReplies: { type: "array", items: { type: "string" } },
      memoryNote: { type: "string" },
    },
    required: ["reply", "smartReplies"],
    additionalProperties: false,
  };

  const salt = "chat-autonomous";
  const idempotencyKey = createHash("sha256")
    .update(`${ks}\x00${salt}\x00${message}`)
    .digest("hex")
    .slice(0, 32);

  const form = new FormData();
  form.set("message", message);
  form.set("schema", JSON.stringify(schema));
  form.set("system_prompt", systemPrompt);

  console.log("Calling agentic LLM...");
  console.log("  idempotencyKey:", idempotencyKey);
  console.log("  message length:", message.length);

  const start = Date.now();
  const res = await fetch("https://api-micro-agentic.quantumbyte.ai/api/llm", {
    method: "POST",
    body: form,
    headers: {
      "x-id-keyspace": ks,
      "idempotency-key": idempotencyKey,
      Authentication: auth,
    },
  });

  const body = await res.json();
  const elapsed = Date.now() - start;

  console.log(`\nStatus: ${res.status} (${elapsed}ms)`);
  console.log("Response:", JSON.stringify(body, null, 2));

  if (body.status === "DONE" && body.response?.reply) {
    console.log("\n✅ SUCCESS — autonomous LLM call works.");
  } else if (body.status === "ERROR") {
    console.log("\n❌ ERROR from agentic service:", body.error);
  } else {
    console.log("\n⚠️  Unexpected response shape.");
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
