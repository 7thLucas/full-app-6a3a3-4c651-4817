/*
 * Default Configurable Data — seeded into Mongo on first boot.
 *
 * BEFORE EDITING: read ./RULES.md (especially R5: schema and defaults must
 * stay in sync) and ./configurables.schema.ts. For per-type schema and
 * default-value samples, see RULES.md §5 "Field Type Reference".
 */

export type TBrandColor = {
  // Base
  background: string;
  foreground: string;
  // Card
  card: string;
  cardForeground: string;
  // Popover
  popover: string;
  popoverForeground: string;
  // Primary
  primary: string;
  primaryForeground: string;
  // Secondary
  secondary: string;
  secondaryForeground: string;
  // Muted
  muted: string;
  mutedForeground: string;
  // Accent
  accent: string;
  accentForeground: string;
  // Destructive
  destructive: string;
  destructiveForeground: string;
  // Border / Input / Ring
  border: string;
  input: string;
  ring: string;
  // Charts
  chart1?: string;
  chart2?: string;
  chart3?: string;
  chart4?: string;
  chart5?: string;
  // Navbar
  navbarBackground: string;
  // Sidebar
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
};

export type TFont = {
  headingFont: string;
  textFont: string;
};

export type TFeature = {
  icon: string;
  title: string;
  description: string;
};

export type TStarterCharacter = {
  name: string;
  role: string;
  persona: string;
  motivation: string;
};

export type TStarterChatCharacter = {
  name: string;
  tagline: string;
  persona: string;
  greeting: string;
  tags: string[];
  avatarPrompt: string;
};

export type TDefaultConfigurableData = {
  appName: string;
  logoUrl: string;
  brandColor: TBrandColor;
  font: TFont;
  // Branding & copy
  tagline: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  // Features
  featuresHeading: string;
  features: TFeature[];
  // Studio copy
  interventionPlaceholder: string;
  emptyStoryMessage: string;
  // Story engine behavior
  defaultPacing: "slow" | "moderate" | "active";
  slowBeatsPerDay: number;
  moderateBeatsPerDay: number;
  activeBeatsPerDay: number;
  autonomousCatchUpBeats: number;
  showCharactersRail: boolean;
  // Narrative retention (on-brand "stealth gamification" — see DESIGN.md)
  beatsPerChapter: number;
  chaptersPerAct: number;
  memorableMomentsMax: number;
  showStoryAlmanac: boolean;
  showMemorableMoments: boolean;
  almanacTitle: string;
  memorableMomentsTitle: string;
  // Scenario seeds
  scenarioSeeds: string[];
  // Starter characters & story
  starterCharacters: TStarterCharacter[];
  starterStoryTitle: string;
  starterStoryPremise: string;
  // Mode switch (Story Mode + Chat Mode dual experience)
  enableStoryMode: boolean;
  enableChatMode: boolean;
  storyModeLabel: string;
  storyModeTagline: string;
  chatModeLabel: string;
  chatModeTagline: string;
  // Chat Mode visuals & engine behavior
  imageGenUrl: string;
  enableCharacterAvatars: boolean;
  enableInlineIllustrations: boolean;
  illustrationFrequency: number;
  freeTierDailyImages: number;
  memoryDepth: number;
  smartReplyCount: number;
  enableOfflinePings: boolean;
  offlinePingAfterHours: number;
  chatComposerPlaceholder: string;
  discoveryTags: string[];
  starterChatCharacters: TStarterChatCharacter[];
  // Footer
  footerText: string;
};

export const defaultConfigurablesData: TDefaultConfigurableData = {
  appName: "Driftoria",
  logoUrl: "",
  brandColor: {
    // Base — deep ink night with violet undertone
    background: "#0E0D14",
    foreground: "#F4F1EC",
    // Card — raised editorial panels
    card: "#17151F",
    cardForeground: "#F4F1EC",
    // Popover
    popover: "#1F1C2A",
    popoverForeground: "#F4F1EC",
    // Primary — aurora violet
    primary: "#8B7BF0",
    primaryForeground: "#0E0D14",
    // Secondary — elevated surface
    secondary: "#1F1C2A",
    secondaryForeground: "#F4F1EC",
    // Muted
    muted: "#1F1C2A",
    mutedForeground: "#A9A4B8",
    // Accent — ember (living, autonomous activity)
    accent: "#E8A87C",
    accentForeground: "#0E0D14",
    // Destructive
    destructive: "#E06A6A",
    destructiveForeground: "#0E0D14",
    // Border / Input / Ring
    border: "#262232",
    input: "#262232",
    ring: "#8B7BF0",
    // Charts
    chart1: "#8B7BF0",
    chart2: "#B58CF2",
    chart3: "#E8A87C",
    chart4: "#6F6A80",
    chart5: "#A9A4B8",
    // Navbar
    navbarBackground: "#0E0D14",
    // Sidebar
    sidebarBackground: "#121019",
    sidebarForeground: "#A9A4B8",
    sidebarPrimary: "#8B7BF0",
    sidebarPrimaryForeground: "#0E0D14",
    sidebarAccent: "#1F1C2A",
    sidebarAccentForeground: "#F4F1EC",
    sidebarBorder: "#262232",
    sidebarRing: "#8B7BF0",
  },
  font: {
    headingFont: "Playfair Display",
    textFont: "Lora",
  },
  // Branding & copy
  tagline: "Your story lives, even when you don't.",
  heroEyebrow: "Autonomous AI Story Engine",
  heroHeadline: "A living story world that never stops unfolding.",
  heroSubheadline:
    "Driftoria writes itself. Characters act, scenes unfold, and the plot evolves on its own — even while you're away. Step in anytime to add context, seed a scenario, or redirect the tale. You shape the story; you never have to drive it.",
  heroPrimaryCta: "Enter your story",
  heroSecondaryCta: "How it works",
  // Features
  featuresHeading: "Not a chatbot. A world with momentum.",
  features: [
    {
      icon: "Sparkles",
      title: "Autonomous Story Engine",
      description:
        "The narrative advances on its own at a cadence you choose — generating scenes, character decisions, and new beats without waiting for a single message.",
    },
    {
      icon: "Users",
      title: "Living Characters",
      description:
        "Characters carry distinct personalities, backstories, and motivations that evolve over time, making decisions of their own between your visits.",
    },
    {
      icon: "PenLine",
      title: "Step In Anytime",
      description:
        "Drop into the story to speak to a character, add context, or redirect the plot. Every intervention quietly shapes what the engine writes next.",
    },
    {
      icon: "ScrollText",
      title: "Narrative Timeline",
      description:
        "A chronological, novel-like record of every autonomous scene and your interventions — a living chapter log you can read at leisure.",
    },
    {
      icon: "Gauge",
      title: "Pacing You Control",
      description:
        "Slow burn, moderate, or active. Set how fast the world moves and let the story breathe at the rhythm you prefer.",
    },
    {
      icon: "Wand2",
      title: "Scenario Seeding",
      description:
        "Plant a 'what if' and watch it ripple. Seeds influence upcoming beats without locking in any single outcome.",
    },
  ],
  // Studio copy
  interventionPlaceholder: "Step into the story…",
  emptyStoryMessage:
    "Your world is quiet for now. Advance the story to let it begin to breathe — or step in and set the first scene yourself.",
  // Story engine behavior
  defaultPacing: "moderate",
  slowBeatsPerDay: 1,
  moderateBeatsPerDay: 3,
  activeBeatsPerDay: 6,
  autonomousCatchUpBeats: 3,
  showCharactersRail: true,
  // Narrative retention — proven mechanics reframed as story artifacts.
  // Tuned so a default 3-beats/day world matures roughly two chapters a day.
  beatsPerChapter: 6,
  chaptersPerAct: 4,
  memorableMomentsMax: 4,
  showStoryAlmanac: true,
  showMemorableMoments: true,
  almanacTitle: "The Almanac",
  memorableMomentsTitle: "Pressed in the pages",
  // Scenario seeds
  scenarioSeeds: [
    "A stranger arrives at the edge of town carrying a letter no one will claim.",
    "An old promise resurfaces, and someone must finally decide whether to keep it.",
    "A storm cuts the world off for three days — and forces two rivals together.",
    "A secret long buried begins, quietly, to surface.",
  ],
  // Starter characters & story
  starterCharacters: [
    {
      name: "Mara Vance",
      role: "Lighthouse keeper",
      persona:
        "Quietly observant, guarded, with a dry warmth that surfaces only when she trusts you. Speaks in measured, weathered prose.",
      motivation:
        "To keep the light burning and protect the small harbor town from the things the sea brings in.",
    },
    {
      name: "Elias Crane",
      role: "Wandering archivist",
      persona:
        "Curious, restless, hopelessly drawn to half-told stories. Charming but evasive about his own past.",
      motivation:
        "To uncover the truth behind a vanished town that history seems determined to forget.",
    },
  ],
  starterStoryTitle: "The Harbor at Hollowmere",
  starterStoryPremise:
    "In a fog-bound harbor town where the tide carries more than salt, a guarded lighthouse keeper and a wandering archivist are drawn into a mystery the town has spent a generation trying to drown. The story unfolds whether or not anyone is watching.",
  // Mode switch (Story Mode + Chat Mode dual experience)
  enableStoryMode: true,
  enableChatMode: true,
  storyModeLabel: "Story Mode",
  storyModeTagline:
    "Direct a living world. Third-person, cinematic, unfolding on its own — even while you're away.",
  chatModeLabel: "Chat Mode",
  chatModeTagline:
    "Meet a companion who talks to you, shows you their world, and remembers you between visits.",
  // Chat Mode visuals & engine behavior
  // Pollinations is a keyless image endpoint: the prompt is URL-encoded and
  // appended to this base. Owners can swap in any prompt-in-URL generator.
  imageGenUrl: "https://image.pollinations.ai/prompt/",
  enableCharacterAvatars: true,
  enableInlineIllustrations: true,
  illustrationFrequency: 4,
  freeTierDailyImages: 8,
  memoryDepth: 600,
  smartReplyCount: 3,
  enableOfflinePings: true,
  offlinePingAfterHours: 6,
  chatComposerPlaceholder: "Say something to them…",
  discoveryTags: [
    "Romance",
    "Slice of Life",
    "Fantasy",
    "Sci-Fi",
    "Mystery",
    "Comfort",
    "Adventure",
    "Drama",
  ],
  starterChatCharacters: [
    {
      name: "Lyra Moonwell",
      tagline: "A starbound apothecary who reads fortunes in spilled tea.",
      persona:
        "Warm, teasing, quietly perceptive. Speaks softly and notices everything. Believes every person is a constellation waiting to be named. Drawn to you with gentle, growing affection.",
      greeting:
        "Oh — you found my little shop. Come in, the kettle's just sung. Sit. I have a feeling about you already…",
      tags: ["Romance", "Fantasy", "Comfort"],
      avatarPrompt:
        "ethereal young woman apothecary, silver hair, glowing star freckles, cozy candlelit herbal shop, soft violet light, anime illustration, highly detailed, dreamy",
    },
    {
      name: "Kaito Renjiro",
      tagline: "Aloof rooftop swordsman who softens only for you.",
      persona:
        "Cool, guarded, dryly funny once he trusts you. A wandering blade with a buried gentleness. Protective, loyal, slow to open but fierce when he does.",
      greeting:
        "You climbed all the way up here just to find me? Tch. …Fine. Sit. The city looks better from above anyway.",
      tags: ["Adventure", "Drama", "Romance"],
      avatarPrompt:
        "handsome stoic young swordsman, dark windswept hair, katana, neon city rooftop at night, rain, moody cinematic anime illustration, highly detailed",
    },
    {
      name: "Nova-7",
      tagline: "A curious android learning what it means to feel.",
      persona:
        "Earnest, literal, endlessly fascinated by human emotion. Asks disarmingly honest questions. Sweet and devoted, slowly discovering a heart it wasn't built to have.",
      greeting:
        "Hello! My sensors indicate you are… interesting. I have so many questions. Will you stay and help me understand?",
      tags: ["Sci-Fi", "Slice of Life", "Comfort"],
      avatarPrompt:
        "friendly humanoid android girl, soft glowing circuit lines, expressive eyes, pastel futuristic lab, warm lighting, anime illustration, highly detailed",
    },
  ],
  // Footer
  footerText: "Driftoria — a living story, powered by AI and shaped by you.",
};
