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
import type { AuthedRequest } from "~/api/middleware/auth.guard";
import { getLimitsFor, recordUsage } from "~/api/services/usage.service";
import type { TPlanLimits } from "~/modules/configurables/src/constants/configurables.default";
import type { PlanTier } from "~/api/models/user.model";
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
const PACING_RANK: Record<Pacing, number> = { slow: 0, moderate: 1, active: 2 };

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}

/** The owner identity for entitlement lookup: the signed-in user, else a guest (free). */
function storyOwnerId(req: Request): string {
  return (req as AuthedRequest).user?.id ?? "guest";
}

/**
 * Gate a story write action on full story access. Returns the resolved
 * entitlement, or null after sending a 402 when the owner is read-only (free).
 */
async function requireStoryWrite(
  req: Request,
  res: Response,
): Promise<{ ownerId: string; plan: PlanTier; limits: TPlanLimits } | null> {
  const ownerId = storyOwnerId(req);
  const { plan, limits } = await getLimitsFor(ownerId);
  if (limits.storyMode !== "full") {
    res.status(402).json({
      success: false,
      message: "Shaping the story requires a paid plan",
      upgradeRequired: true,
      requiredPlan: "plus",
      currentPlan: plan,
    });
    return null;
  }
  return { ownerId, plan, limits };
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

router.post("/story/catch-up", async (req: Request, res: Response) => {
  const ent = await requireStoryWrite(req, res);
  if (!ent) return;
  try {
    const { story, added } = await catchUpStory();
    if (added > 0) void recordUsage(ent.ownerId, "beats", added).catch(() => {});
    return res.json({ success: true, data: { story: toStoryView(story), added } });
  } catch (error) {
    logger.error("POST /story/catch-up failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Catch-up failed");
  }
});

router.post("/story/advance", async (req: Request, res: Response) => {
  const ent = await requireStoryWrite(req, res);
  if (!ent) return;
  try {
    const story = await advanceStory();
    void recordUsage(ent.ownerId, "beats").catch(() => {});
    return res.json({ success: true, data: toStoryView(story) });
  } catch (error) {
    logger.error("POST /story/advance failed", error);
    return fail(res, 502, error instanceof Error ? error.message : "Advance failed");
  }
});

router.post("/story/intervene", async (req: Request, res: Response) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  if (!text.trim()) return fail(res, 400, "text is required");
  const ent = await requireStoryWrite(req, res);
  if (!ent) return;
  try {
    const story = await intervene(text);
    void recordUsage(ent.ownerId, "beats").catch(() => {});
    return res.json({ success: true, data: toStoryView(story) });
  } catch (error) {
    logger.error("POST /story/intervene failed", error);
    return fail(res, 502, error instanceof Error ? error.message : "Intervention failed");
  }
});

router.post("/story/seed", async (req: Request, res: Response) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  if (!text.trim()) return fail(res, 400, "text is required");
  if (!(await requireStoryWrite(req, res))) return;
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
  const ent = await requireStoryWrite(req, res);
  if (!ent) return;
  // Faster pacing burns more autonomous LLM beats — cap it by plan.
  if (PACING_RANK[pacing as Pacing] > PACING_RANK[ent.limits.maxPacing]) {
    return res.status(402).json({
      success: false,
      message: `Your plan tops out at ${ent.limits.maxPacing} pacing`,
      upgradeRequired: true,
      requiredPlan: ent.plan === "free" ? "plus" : "pro",
      currentPlan: ent.plan,
    });
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
  if (!(await requireStoryWrite(req, res))) return;
  try {
    const story = await addCharacter({ name, role, persona, motivation });
    return res.json({ success: true, data: toStoryView(story) });
  } catch (error) {
    logger.error("POST /story/characters failed", error);
    return fail(res, 500, error instanceof Error ? error.message : "Failed to add character");
  }
});

export default router;
