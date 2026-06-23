/* START: THIS SECTION CODE IS CANNOT BE CHANGED, YOU ONLY READ IT */
export interface FieldSchemaType {
  fieldName?: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "color"
    | "url"
    | "enum"
    | "datetime"
    | "file"
    | "files";
  required?: boolean;
  label?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: string[];
  fields?: FieldSchemaType[];
  item?: FieldSchemaType;
}
/* END: THIS SECTION CODE IS CANNOT BE CHANGED, YOU ONLY READ IT */

export type ConfigurableSchemas = {
  formSchema: FieldSchemaType[];
};

export const configurableSchemas: ConfigurableSchemas = {
  formSchema: [
    {
      fieldName: "appName",
      type: "string",
      required: true,
      label: "App Name",
    },
    {
      fieldName: "logoUrl",
      type: "url",
      required: true,
      label: "Logo URL",
    },
    {
      fieldName: "brandColor",
      type: "object",
      required: true,
      label: "Brand Color",
      fields: [
        // ── Base ────────────────────────────────────────────────────────────
        {
          fieldName: "background",
          type: "color",
          required: true,
          label: "Background",
        },
        {
          fieldName: "foreground",
          type: "color",
          required: true,
          label: "Foreground",
        },
        // ── Card ────────────────────────────────────────────────────────────
        { fieldName: "card", type: "color", required: true, label: "Card" },
        {
          fieldName: "cardForeground",
          type: "color",
          required: true,
          label: "Card Foreground",
        },
        // ── Popover ─────────────────────────────────────────────────────────
        {
          fieldName: "popover",
          type: "color",
          required: true,
          label: "Popover",
        },
        {
          fieldName: "popoverForeground",
          type: "color",
          required: true,
          label: "Popover Foreground",
        },
        // ── Primary ─────────────────────────────────────────────────────────
        {
          fieldName: "primary",
          type: "color",
          required: true,
          label: "Primary",
        },
        {
          fieldName: "primaryForeground",
          type: "color",
          required: true,
          label: "Primary Foreground",
        },
        // ── Secondary ───────────────────────────────────────────────────────
        {
          fieldName: "secondary",
          type: "color",
          required: true,
          label: "Secondary",
        },
        {
          fieldName: "secondaryForeground",
          type: "color",
          required: true,
          label: "Secondary Foreground",
        },
        // ── Muted ───────────────────────────────────────────────────────────
        { fieldName: "muted", type: "color", required: true, label: "Muted" },
        {
          fieldName: "mutedForeground",
          type: "color",
          required: true,
          label: "Muted Foreground",
        },
        // ── Accent ──────────────────────────────────────────────────────────
        { fieldName: "accent", type: "color", required: true, label: "Accent" },
        {
          fieldName: "accentForeground",
          type: "color",
          required: true,
          label: "Accent Foreground",
        },
        // ── Destructive ─────────────────────────────────────────────────────
        {
          fieldName: "destructive",
          type: "color",
          required: true,
          label: "Destructive",
        },
        {
          fieldName: "destructiveForeground",
          type: "color",
          required: true,
          label: "Destructive Foreground",
        },
        // ── Border / Input / Ring ────────────────────────────────────────────
        { fieldName: "border", type: "color", required: true, label: "Border" },
        { fieldName: "input", type: "color", required: true, label: "Input" },
        { fieldName: "ring", type: "color", required: true, label: "Ring" },
        // ── Charts ──────────────────────────────────────────────────────────
        {
          fieldName: "chart1",
          type: "color",
          required: false,
          label: "Chart 1",
        },
        {
          fieldName: "chart2",
          type: "color",
          required: false,
          label: "Chart 2",
        },
        {
          fieldName: "chart3",
          type: "color",
          required: false,
          label: "Chart 3",
        },
        {
          fieldName: "chart4",
          type: "color",
          required: false,
          label: "Chart 4",
        },
        {
          fieldName: "chart5",
          type: "color",
          required: false,
          label: "Chart 5",
        },
        // ── Navbar ──────────────────────────────────────────────────────────
        {
          fieldName: "navbarBackground",
          type: "color",
          required: true,
          label: "Navbar Background",
        },
        // ── Sidebar ─────────────────────────────────────────────────────────
        {
          fieldName: "sidebarBackground",
          type: "color",
          required: true,
          label: "Sidebar Background",
        },
        {
          fieldName: "sidebarForeground",
          type: "color",
          required: true,
          label: "Sidebar Foreground",
        },
        {
          fieldName: "sidebarPrimary",
          type: "color",
          required: true,
          label: "Sidebar Primary",
        },
        {
          fieldName: "sidebarPrimaryForeground",
          type: "color",
          required: true,
          label: "Sidebar Primary Foreground",
        },
        {
          fieldName: "sidebarAccent",
          type: "color",
          required: true,
          label: "Sidebar Accent",
        },
        {
          fieldName: "sidebarAccentForeground",
          type: "color",
          required: true,
          label: "Sidebar Accent Foreground",
        },
        {
          fieldName: "sidebarBorder",
          type: "color",
          required: true,
          label: "Sidebar Border",
        },
        {
          fieldName: "sidebarRing",
          type: "color",
          required: true,
          label: "Sidebar Ring",
        },
      ],
    },

    {
      fieldName: "font",
      type: "object",
      required: true,
      label: "Typography",
      fields: [
        {
          fieldName: "headingFont",
          type: "enum",
          required: true,
          label: "Heading Font",
          options: [
            "Inter",
            "Inter Tight",
            "Plus Jakarta Sans",
            "Poppins",
            "Montserrat",
            "Raleway",
            "Playfair Display",
            "Lora",
            "Merriweather",
            "EB Garamond",
            "Cinzel",
            "Cormorant Garamond",
            "Libre Baskerville",
            "PT Serif",
            "Nunito",
            "Outfit",
            "DM Sans",
            "Sora",
            "Space Grotesk",
            "Josefin Sans",
            "Rubik",
            "Quicksand",
            "Figtree",
            "Lexend",
          ],
        },
        {
          fieldName: "textFont",
          type: "enum",
          required: true,
          label: "Text Font",
          options: [
            "Inter",
            "Inter Tight",
            "Plus Jakarta Sans",
            "Poppins",
            "Montserrat",
            "Raleway",
            "Lora",
            "Merriweather",
            "EB Garamond",
            "Libre Baskerville",
            "PT Serif",
            "Nunito",
            "Outfit",
            "DM Sans",
            "Sora",
            "Source Sans 3",
            "Noto Sans",
            "Lato",
            "Open Sans",
            "Roboto",
            "Rubik",
            "Quicksand",
            "Figtree",
            "Lexend",
          ],
        },
      ],
    },

    // ── Branding & Copy ─────────────────────────────────────────────────
    { fieldName: "tagline", type: "string", required: false, label: "Tagline" },
    {
      fieldName: "heroEyebrow",
      type: "string",
      required: false,
      label: "Hero Eyebrow Label",
    },
    {
      fieldName: "heroHeadline",
      type: "string",
      required: false,
      label: "Hero Headline",
    },
    {
      fieldName: "heroSubheadline",
      type: "string",
      required: false,
      label: "Hero Subheadline",
    },
    {
      fieldName: "heroPrimaryCta",
      type: "string",
      required: false,
      label: "Hero Primary CTA Label",
    },
    {
      fieldName: "heroSecondaryCta",
      type: "string",
      required: false,
      label: "Hero Secondary CTA Label",
    },

    // ── Feature section ─────────────────────────────────────────────────
    {
      fieldName: "featuresHeading",
      type: "string",
      required: false,
      label: "Features Heading",
    },
    {
      fieldName: "features",
      type: "array",
      required: false,
      label: "Features",
      item: {
        type: "object",
        required: true,
        fields: [
          {
            fieldName: "icon",
            type: "string",
            required: true,
            label: "Icon (lucide name)",
          },
          {
            fieldName: "title",
            type: "string",
            required: true,
            label: "Title",
          },
          {
            fieldName: "description",
            type: "string",
            required: true,
            label: "Description",
          },
        ],
      },
    },

    // ── Studio (app) copy ───────────────────────────────────────────────
    {
      fieldName: "interventionPlaceholder",
      type: "string",
      required: false,
      label: "Intervention Composer Placeholder",
    },
    {
      fieldName: "emptyStoryMessage",
      type: "string",
      required: false,
      label: "Empty Story Message",
    },

    // ── Story engine behavior (configurable logic) ──────────────────────
    {
      fieldName: "defaultPacing",
      type: "enum",
      required: true,
      label: "Default Pacing",
      options: ["slow", "moderate", "active"],
    },
    {
      fieldName: "slowBeatsPerDay",
      type: "number",
      required: true,
      label: "Slow Burn — Beats Per Day",
      min: 1,
      max: 24,
    },
    {
      fieldName: "moderateBeatsPerDay",
      type: "number",
      required: true,
      label: "Moderate — Beats Per Day",
      min: 1,
      max: 24,
    },
    {
      fieldName: "activeBeatsPerDay",
      type: "number",
      required: true,
      label: "Active — Beats Per Day",
      min: 1,
      max: 48,
    },
    {
      fieldName: "autonomousCatchUpBeats",
      type: "number",
      required: true,
      label: "Max Autonomous Catch-Up Beats",
      min: 1,
      max: 12,
    },
    {
      fieldName: "showCharactersRail",
      type: "boolean",
      required: false,
      label: "Show Characters Rail",
    },

    // ── Narrative retention (on-brand "stealth gamification") ────────────
    {
      fieldName: "beatsPerChapter",
      type: "number",
      required: true,
      label: "Beats Per Chapter",
      min: 1,
      max: 24,
    },
    {
      fieldName: "chaptersPerAct",
      type: "number",
      required: true,
      label: "Chapters Per Act",
      min: 1,
      max: 24,
    },
    {
      fieldName: "memorableMomentsMax",
      type: "number",
      required: true,
      label: "Memorable Moments — Max Shown",
      min: 1,
      max: 12,
    },
    {
      fieldName: "showStoryAlmanac",
      type: "boolean",
      required: false,
      label: "Show Story Almanac",
    },
    {
      fieldName: "showMemorableMoments",
      type: "boolean",
      required: false,
      label: "Show Memorable Moments",
    },
    {
      fieldName: "almanacTitle",
      type: "string",
      required: false,
      label: "Almanac Card Title",
    },
    {
      fieldName: "memorableMomentsTitle",
      type: "string",
      required: false,
      label: "Memorable Moments Card Title",
    },

    // ── Scenario seed suggestions ───────────────────────────────────────
    {
      fieldName: "scenarioSeeds",
      type: "array",
      required: false,
      label: "Scenario Seed Suggestions",
      item: { type: "string", required: true },
    },

    // ── Starter characters ──────────────────────────────────────────────
    {
      fieldName: "starterCharacters",
      type: "array",
      required: false,
      label: "Starter Characters",
      item: {
        type: "object",
        required: true,
        fields: [
          { fieldName: "name", type: "string", required: true, label: "Name" },
          { fieldName: "role", type: "string", required: true, label: "Role" },
          {
            fieldName: "persona",
            type: "string",
            required: true,
            label: "Persona",
          },
          {
            fieldName: "motivation",
            type: "string",
            required: true,
            label: "Motivation",
          },
        ],
      },
    },

    // ── Starter story premise ───────────────────────────────────────────
    {
      fieldName: "starterStoryTitle",
      type: "string",
      required: false,
      label: "Starter Story Title",
    },
    {
      fieldName: "starterStoryPremise",
      type: "string",
      required: false,
      label: "Starter Story Premise",
    },

    // ── Mode switch (Story Mode + Chat Mode dual experience) ────────────
    {
      fieldName: "enableStoryMode",
      type: "boolean",
      required: false,
      label: "Enable Story Mode (Director)",
    },
    {
      fieldName: "enableChatMode",
      type: "boolean",
      required: false,
      label: "Enable Chat Mode (Companion)",
    },
    {
      fieldName: "storyModeLabel",
      type: "string",
      required: false,
      label: "Story Mode — Door Label",
    },
    {
      fieldName: "storyModeTagline",
      type: "string",
      required: false,
      label: "Story Mode — Door Tagline",
    },
    {
      fieldName: "chatModeLabel",
      type: "string",
      required: false,
      label: "Chat Mode — Door Label",
    },
    {
      fieldName: "chatModeTagline",
      type: "string",
      required: false,
      label: "Chat Mode — Door Tagline",
    },

    // ── Chat Mode: visuals & engine behavior ────────────────────────────
    {
      fieldName: "imageGenUrl",
      type: "url",
      required: false,
      label: "Image Generation Base URL (prompt appended, URL-encoded)",
    },
    {
      fieldName: "enableCharacterAvatars",
      type: "boolean",
      required: false,
      label: "Generate Character Avatar Art",
    },
    {
      fieldName: "enableInlineIllustrations",
      type: "boolean",
      required: false,
      label: "Generate Inline Scene Illustrations",
    },
    {
      fieldName: "illustrationFrequency",
      type: "number",
      required: true,
      label: "Illustration Frequency (~1 scene image per N turns)",
      min: 1,
      max: 20,
    },
    {
      fieldName: "freeTierDailyImages",
      type: "number",
      required: true,
      label: "Free Tier — Daily Inline Illustrations Cap",
      min: 0,
      max: 100,
    },
    {
      fieldName: "memoryDepth",
      type: "number",
      required: true,
      label: "Companion Memory Depth (characters)",
      min: 0,
      max: 4000,
    },
    {
      fieldName: "smartReplyCount",
      type: "number",
      required: true,
      label: "Smart Reply Suggestions Per Turn",
      min: 0,
      max: 6,
    },
    {
      fieldName: "enableOfflinePings",
      type: "boolean",
      required: false,
      label: "Enable Offline Companion Pings",
    },
    {
      fieldName: "offlinePingAfterHours",
      type: "number",
      required: true,
      label: "Offline Ping — Hours Away Before Companion Reaches Out",
      min: 1,
      max: 168,
    },
    {
      fieldName: "chatComposerPlaceholder",
      type: "string",
      required: false,
      label: "Chat Composer Placeholder",
    },
    {
      fieldName: "discoveryTags",
      type: "array",
      required: false,
      label: "Discovery Feed Filter Tags",
      item: { type: "string", required: true },
    },
    {
      fieldName: "starterChatCharacters",
      type: "array",
      required: false,
      label: "Starter Chat Companions",
      item: {
        type: "object",
        required: true,
        fields: [
          { fieldName: "name", type: "string", required: true, label: "Name" },
          {
            fieldName: "tagline",
            type: "string",
            required: true,
            label: "Tagline",
          },
          {
            fieldName: "persona",
            type: "string",
            required: true,
            label: "Persona",
          },
          {
            fieldName: "greeting",
            type: "string",
            required: true,
            label: "Opening Greeting",
          },
          {
            fieldName: "tags",
            type: "array",
            required: false,
            label: "Tags",
            item: { type: "string", required: true },
          },
          {
            fieldName: "avatarPrompt",
            type: "string",
            required: true,
            label: "Avatar Art Prompt",
          },
        ],
      },
    },

    // ── Monetization (freemium subscription tiers; -1 = unlimited) ────────
    {
      fieldName: "plans",
      type: "object",
      required: true,
      label: "Subscription Plans & Tier Limits",
      fields: [
        ...(["free", "plus", "pro"] as const).map((tier) => ({
          fieldName: tier,
          type: "object" as const,
          required: true,
          label: `${tier[0].toUpperCase()}${tier.slice(1)} Plan`,
          fields: [
            { fieldName: "label", type: "string" as const, required: true, label: "Display Label" },
            { fieldName: "priceMonthly", type: "number" as const, required: true, label: "Price / Month", min: 0, max: 9999 },
            { fieldName: "dailyMessages", type: "number" as const, required: true, label: "Daily Messages (-1 = unlimited)", min: -1, max: 100000 },
            { fieldName: "dailyImages", type: "number" as const, required: true, label: "Daily Inline Images (-1 = unlimited)", min: -1, max: 100000 },
            { fieldName: "maxCompanions", type: "number" as const, required: true, label: "Max Companions (-1 = unlimited)", min: -1, max: 100000 },
            { fieldName: "offlinePings", type: "boolean" as const, required: false, label: "Offline Companion Pings" },
            { fieldName: "characterAvatars", type: "boolean" as const, required: false, label: "Character Avatar Art" },
            { fieldName: "memoryDepth", type: "number" as const, required: true, label: "Companion Memory Depth (chars)", min: 0, max: 8000 },
            { fieldName: "maxPacing", type: "enum" as const, required: true, label: "Max Story Pacing", options: ["slow", "moderate", "active"] },
            { fieldName: "storyMode", type: "enum" as const, required: true, label: "Story Mode Access", options: ["read", "full"] },
            { fieldName: "premiumModel", type: "boolean" as const, required: false, label: "Premium LLM Model" },
          ],
        })),
      ],
    },

    // ── Footer ──────────────────────────────────────────────────────────
    {
      fieldName: "footerText",
      type: "string",
      required: false,
      label: "Footer Text",
    },
  ],
};
