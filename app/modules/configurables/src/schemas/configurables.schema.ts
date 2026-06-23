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
        { fieldName: "background",        type: "color", required: true,  label: "Background" },
        { fieldName: "foreground",        type: "color", required: true,  label: "Foreground" },
        // ── Card ────────────────────────────────────────────────────────────
        { fieldName: "card",              type: "color", required: true,  label: "Card" },
        { fieldName: "cardForeground",    type: "color", required: true,  label: "Card Foreground" },
        // ── Popover ─────────────────────────────────────────────────────────
        { fieldName: "popover",           type: "color", required: true,  label: "Popover" },
        { fieldName: "popoverForeground", type: "color", required: true,  label: "Popover Foreground" },
        // ── Primary ─────────────────────────────────────────────────────────
        { fieldName: "primary",           type: "color", required: true,  label: "Primary" },
        { fieldName: "primaryForeground", type: "color", required: true,  label: "Primary Foreground" },
        // ── Secondary ───────────────────────────────────────────────────────
        { fieldName: "secondary",           type: "color", required: true,  label: "Secondary" },
        { fieldName: "secondaryForeground", type: "color", required: true,  label: "Secondary Foreground" },
        // ── Muted ───────────────────────────────────────────────────────────
        { fieldName: "muted",           type: "color", required: true,  label: "Muted" },
        { fieldName: "mutedForeground", type: "color", required: true,  label: "Muted Foreground" },
        // ── Accent ──────────────────────────────────────────────────────────
        { fieldName: "accent",           type: "color", required: true,  label: "Accent" },
        { fieldName: "accentForeground", type: "color", required: true,  label: "Accent Foreground" },
        // ── Destructive ─────────────────────────────────────────────────────
        { fieldName: "destructive",           type: "color", required: true,  label: "Destructive" },
        { fieldName: "destructiveForeground", type: "color", required: true,  label: "Destructive Foreground" },
        // ── Border / Input / Ring ────────────────────────────────────────────
        { fieldName: "border", type: "color", required: true, label: "Border" },
        { fieldName: "input",  type: "color", required: true, label: "Input" },
        { fieldName: "ring",   type: "color", required: true, label: "Ring" },
        // ── Charts ──────────────────────────────────────────────────────────
        { fieldName: "chart1", type: "color", required: false, label: "Chart 1" },
        { fieldName: "chart2", type: "color", required: false, label: "Chart 2" },
        { fieldName: "chart3", type: "color", required: false, label: "Chart 3" },
        { fieldName: "chart4", type: "color", required: false, label: "Chart 4" },
        { fieldName: "chart5", type: "color", required: false, label: "Chart 5" },
        // ── Navbar ──────────────────────────────────────────────────────────
        { fieldName: "navbarBackground", type: "color", required: true, label: "Navbar Background" },
        // ── Sidebar ─────────────────────────────────────────────────────────
        { fieldName: "sidebarBackground",        type: "color", required: true,  label: "Sidebar Background" },
        { fieldName: "sidebarForeground",        type: "color", required: true,  label: "Sidebar Foreground" },
        { fieldName: "sidebarPrimary",           type: "color", required: true,  label: "Sidebar Primary" },
        { fieldName: "sidebarPrimaryForeground", type: "color", required: true,  label: "Sidebar Primary Foreground" },
        { fieldName: "sidebarAccent",            type: "color", required: true,  label: "Sidebar Accent" },
        { fieldName: "sidebarAccentForeground",  type: "color", required: true,  label: "Sidebar Accent Foreground" },
        { fieldName: "sidebarBorder",            type: "color", required: true,  label: "Sidebar Border" },
        { fieldName: "sidebarRing",              type: "color", required: true,  label: "Sidebar Ring" },
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
    { fieldName: "heroEyebrow", type: "string", required: false, label: "Hero Eyebrow Label" },
    { fieldName: "heroHeadline", type: "string", required: false, label: "Hero Headline" },
    { fieldName: "heroSubheadline", type: "string", required: false, label: "Hero Subheadline" },
    { fieldName: "heroPrimaryCta", type: "string", required: false, label: "Hero Primary CTA Label" },
    { fieldName: "heroSecondaryCta", type: "string", required: false, label: "Hero Secondary CTA Label" },

    // ── Feature section ─────────────────────────────────────────────────
    { fieldName: "featuresHeading", type: "string", required: false, label: "Features Heading" },
    {
      fieldName: "features",
      type: "array",
      required: false,
      label: "Features",
      item: {
        type: "object",
        required: true,
        fields: [
          { fieldName: "icon", type: "string", required: true, label: "Icon (lucide name)" },
          { fieldName: "title", type: "string", required: true, label: "Title" },
          { fieldName: "description", type: "string", required: true, label: "Description" },
        ],
      },
    },

    // ── Studio (app) copy ───────────────────────────────────────────────
    { fieldName: "interventionPlaceholder", type: "string", required: false, label: "Intervention Composer Placeholder" },
    { fieldName: "emptyStoryMessage", type: "string", required: false, label: "Empty Story Message" },

    // ── Story engine behavior (configurable logic) ──────────────────────
    {
      fieldName: "defaultPacing",
      type: "enum",
      required: true,
      label: "Default Pacing",
      options: ["slow", "moderate", "active"],
    },
    { fieldName: "slowBeatsPerDay", type: "number", required: true, label: "Slow Burn — Beats Per Day", min: 1, max: 24 },
    { fieldName: "moderateBeatsPerDay", type: "number", required: true, label: "Moderate — Beats Per Day", min: 1, max: 24 },
    { fieldName: "activeBeatsPerDay", type: "number", required: true, label: "Active — Beats Per Day", min: 1, max: 48 },
    { fieldName: "autonomousCatchUpBeats", type: "number", required: true, label: "Max Autonomous Catch-Up Beats", min: 1, max: 12 },
    { fieldName: "showCharactersRail", type: "boolean", required: false, label: "Show Characters Rail" },

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
          { fieldName: "persona", type: "string", required: true, label: "Persona" },
          { fieldName: "motivation", type: "string", required: true, label: "Motivation" },
        ],
      },
    },

    // ── Starter story premise ───────────────────────────────────────────
    { fieldName: "starterStoryTitle", type: "string", required: false, label: "Starter Story Title" },
    { fieldName: "starterStoryPremise", type: "string", required: false, label: "Starter Story Premise" },

    // ── Footer ──────────────────────────────────────────────────────────
    { fieldName: "footerText", type: "string", required: false, label: "Footer Text" },
  ],
};