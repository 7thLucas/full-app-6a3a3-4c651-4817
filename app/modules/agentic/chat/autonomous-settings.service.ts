import { UserAutonomousSettingsModel, type Cadence, type NotifyFrequency, type UserAutonomousSettings } from "../autonomous-settings.model";
import { defaultConfigurablesData } from "~/modules/configurables/src/constants/configurables.default";

const DEFAULT_SETTINGS: UserAutonomousSettings = {
  ownerId: "",
  tickIntervalMinutes: 240,
  cadence: "normal",
  simulateUser: true,
  storyTone: "",
  personality: "",
  relationship: "",
  memoryDepth: 600,
  notifyFrequency: "off",
};

function cadenceMultiplier(cadence: Cadence): number {
  if (cadence === "slow") return 2;
  if (cadence === "active") return 0.5;
  return 1; // normal
}

export interface AutonomousUserContext {
  tickIntervalMinutes: number;
  effectivePingsPerHour: number;
  simulateUser: boolean;
  storyTone: string;
  personality: string;
  relationship: string;
  memoryDepth: number;
  notifyFrequency: NotifyFrequency;
}

/** Get settings for a user, auto-creating defaults for registered users. */
export async function getAutonomousSettings(ownerId: string): Promise<UserAutonomousSettings> {
  const doc = await UserAutonomousSettingsModel.findOne({ ownerId }).lean().exec();
  if (doc) {
    const settings = doc as unknown as UserAutonomousSettings;
    return {
      ownerId: settings.ownerId,
      tickIntervalMinutes: settings.tickIntervalMinutes ?? DEFAULT_SETTINGS.tickIntervalMinutes,
      cadence: settings.cadence ?? DEFAULT_SETTINGS.cadence,
      simulateUser: settings.simulateUser ?? DEFAULT_SETTINGS.simulateUser,
      storyTone: settings.storyTone ?? DEFAULT_SETTINGS.storyTone,
      personality: settings.personality ?? DEFAULT_SETTINGS.personality,
      relationship: settings.relationship ?? DEFAULT_SETTINGS.relationship,
      memoryDepth: settings.memoryDepth ?? DEFAULT_SETTINGS.memoryDepth,
      notifyFrequency: settings.notifyFrequency ?? DEFAULT_SETTINGS.notifyFrequency,
    };
  }

  // Auto-create default settings for registered users so personalization
  // is always available. Uses upsert to avoid race on parallel first access.
  // Anon users get in-memory defaults only.
  if (!ownerId.startsWith("anon_")) {
    await UserAutonomousSettingsModel.updateOne(
      { ownerId },
      { $setOnInsert: { ...DEFAULT_SETTINGS, ownerId } },
      { upsert: true },
    );
  }

  return { ...DEFAULT_SETTINGS, ownerId };
}

/** Resolve the effective autonomous context for generation. */
export function resolveAutonomousContext(
  settings: UserAutonomousSettings,
  globalCfg: typeof defaultConfigurablesData,
): AutonomousUserContext {
  const pingsPerHour = globalCfg.chatPingsPerHour * cadenceMultiplier(settings.cadence);
  return {
    tickIntervalMinutes: settings.tickIntervalMinutes,
    effectivePingsPerHour: Math.max(0.1, pingsPerHour),
    simulateUser: settings.simulateUser,
    storyTone: settings.storyTone,
    personality: settings.personality,
    relationship: settings.relationship,
    memoryDepth: settings.memoryDepth,
    notifyFrequency: settings.notifyFrequency,
  };
}

/** Upsert settings for a user. */
export async function upsertAutonomousSettings(
  ownerId: string,
  data: Partial<Omit<UserAutonomousSettings, "ownerId">>,
): Promise<UserAutonomousSettings> {
  await UserAutonomousSettingsModel.updateOne(
    { ownerId },
    { $set: { ...data, ownerId } },
    { upsert: true },
  );
  return getAutonomousSettings(ownerId);
}
