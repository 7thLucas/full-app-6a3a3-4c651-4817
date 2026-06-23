/**
 * Driftoria Chat Mode API (the Emochi-class 1:1 companion experience).
 *
 * Surface (auto-discovered under /api by app/api/routes.ts):
 *   GET  /api/chat/characters             — discovery feed (seeds starters on first hit).
 *   POST /api/chat/characters             — { name, tagline, persona, greeting?, tags?, avatarPrompt? } create a companion.
 *   GET  /api/chat/characters/:id         — single character card.
 *   GET  /api/chat/sessions/:id           — open a session (may include an offline ping).
 *   POST /api/chat/sessions/:id/messages  — { text } send a message, get the reply.
 */

import { Router, type Request, type Response } from "express";
import { createLogger } from "~/lib/logger";
import {
  createCharacter,
  getCharacter,
  listCharacters,
  openSession,
  sendMessage,
  toCardView,
} from "./chat/chat.service";
import { resolveOwnerId } from "./chat/chat.owner";

const logger = createLogger("ChatRoutes");
const router = Router();

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}

router.get("/chat/characters", async (_req: Request, res: Response) => {
  try {
    const characters = await listCharacters();
    return res.json({ success: true, data: characters.map(toCardView) });
  } catch (error) {
    logger.error("GET /chat/characters failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Failed to load companions");
  }
});

router.post("/chat/characters", async (req: Request, res: Response) => {
  const { name, tagline, persona, greeting, tags, avatarPrompt } = req.body ?? {};
  if (
    typeof name !== "string" || !name.trim() ||
    typeof tagline !== "string" || !tagline.trim() ||
    typeof persona !== "string" || !persona.trim()
  ) {
    return fail(res, 400, "name, tagline, and persona are required");
  }
  try {
    const ownerId = resolveOwnerId(req, res);
    const character = await createCharacter(
      {
        name,
        tagline,
        persona,
        greeting: typeof greeting === "string" ? greeting : undefined,
        tags: Array.isArray(tags) ? tags.map((t) => String(t)) : undefined,
        avatarPrompt: typeof avatarPrompt === "string" ? avatarPrompt : undefined,
      },
      ownerId,
    );
    return res.json({ success: true, data: toCardView(character) });
  } catch (error) {
    logger.error("POST /chat/characters failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Failed to create companion");
  }
});

router.get("/chat/characters/:id", async (req: Request, res: Response) => {
  try {
    const character = await getCharacter(String(req.params.id));
    if (!character) return fail(res, 404, "Character not found");
    return res.json({ success: true, data: toCardView(character) });
  } catch (error) {
    logger.error("GET /chat/characters/:id failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Failed to load companion");
  }
});

router.get("/chat/sessions/:id", async (req: Request, res: Response) => {
  try {
    const ownerId = resolveOwnerId(req, res);
    const view = await openSession(String(req.params.id), ownerId);
    return res.json({ success: true, data: view });
  } catch (error) {
    logger.error("GET /chat/sessions/:id failed", error);
    const msg = error instanceof Error ? error.message : "Failed to open session";
    return fail(res, msg === "Character not found" ? 404 : 500, msg);
  }
});

router.post("/chat/sessions/:id/messages", async (req: Request, res: Response) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  if (!text.trim()) return fail(res, 400, "text is required");
  try {
    const ownerId = resolveOwnerId(req, res);
    const view = await sendMessage(String(req.params.id), ownerId, text);
    return res.json({ success: true, data: view });
  } catch (error) {
    logger.error("POST /chat/sessions/:id/messages failed", error);
    const msg = error instanceof Error ? error.message : "Message failed";
    return fail(res, msg === "Character not found" ? 404 : 502, msg);
  }
});

export default router;
