/**
 * Driftoria story-engine API.
 *
 * Surface (auto-discovered under /api):
 *   GET  /api/story            — current world state (creates starter on first hit).
 *   POST /api/story/catch-up   — generate any autonomous beats owed since last visit.
 *   POST /api/story/advance    — generate one autonomous beat now.
 *   POST /api/story/intervene  — { text } record an intervention + responding scene.
 *   POST /api/story/seed       — { text } plant a scenario seed.
 *   POST /api/story/pacing     — { pacing } set pacing (slow|moderate|active).
 *   POST /api/story/characters — { name, role, persona, motivation } add a character.
 */

import { Router, type Request, type Response } from "express";
import { createLogger } from "~/lib/logger";
import type { Pacing } from "./story.model";
import {
  addCharacter,
  advanceStory,
  catchUpStory,
  getOrCreateStory,
  intervene,
  seedScenario,
  setPacing,
  toStoryView,
} from "./story/story.service";

const logger = createLogger("StoryRoutes");
const router = Router();

const VALID_PACING: Pacing[] = ["slow", "moderate", "active"];

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}

router.get("/story", async (_req: Request, res: Response) => {
  try {
    const story = await getOrCreateStory();
    return res.json({ success: true, data: toStoryView(story) });
  } catch (error) {
    logger.error("GET /story failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Failed to load story");
  }
});

router.post("/story/catch-up", async (_req: Request, res: Response) => {
  try {
    const { story, added } = await catchUpStory();
    return res.json({ success: true, data: { story: toStoryView(story), added } });
  } catch (error) {
    logger.error("POST /story/catch-up failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Catch-up failed");
  }
});

router.post("/story/advance", async (_req: Request, res: Response) => {
  try {
    const story = await advanceStory();
    return res.json({ success: true, data: toStoryView(story) });
  } catch (error) {
    logger.error("POST /story/advance failed", error);
    return fail(res, 502, error instanceof Error ? error.message : "Advance failed");
  }
});

router.post("/story/intervene", async (req: Request, res: Response) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  if (!text.trim()) return fail(res, 400, "text is required");
  try {
    const story = await intervene(text);
    return res.json({ success: true, data: toStoryView(story) });
  } catch (error) {
    logger.error("POST /story/intervene failed", error);
    return fail(res, 502, error instanceof Error ? error.message : "Intervention failed");
  }
});

router.post("/story/seed", async (req: Request, res: Response) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  if (!text.trim()) return fail(res, 400, "text is required");
  try {
    const story = await seedScenario(text);
    return res.json({ success: true, data: toStoryView(story) });
  } catch (error) {
    logger.error("POST /story/seed failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Seeding failed");
  }
});

router.post("/story/pacing", async (req: Request, res: Response) => {
  const pacing = req.body?.pacing;
  if (!VALID_PACING.includes(pacing)) {
    return fail(res, 400, "pacing must be one of: slow, moderate, active");
  }
  try {
    const story = await setPacing(pacing);
    return res.json({ success: true, data: toStoryView(story) });
  } catch (error) {
    logger.error("POST /story/pacing failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Failed to set pacing");
  }
});

router.post("/story/characters", async (req: Request, res: Response) => {
  const { name, role, persona, motivation } = req.body ?? {};
  if (
    typeof name !== "string" || !name.trim() ||
    typeof role !== "string" || !role.trim() ||
    typeof persona !== "string" || !persona.trim() ||
    typeof motivation !== "string" || !motivation.trim()
  ) {
    return fail(res, 400, "name, role, persona, and motivation are all required");
  }
  try {
    const story = await addCharacter({ name, role, persona, motivation });
    return res.json({ success: true, data: toStoryView(story) });
  } catch (error) {
    logger.error("POST /story/characters failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Failed to add character");
  }
});

export default router;
