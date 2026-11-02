/*
  The shapes the studio edits for site-wide settings, and the field list for
  page copy. No server imports: the editors load this in the browser, and the
  server's checks read the same list, so a field cannot exist in one and not
  the other.
*/

export type SettingKey = "site" | "nav" | "copy";

export type SiteDraft = {
  name: string;
  url: string;
  tagline: string;
  email: string;
  instagram: string;
};

export type NavItemDraft = { href: string; label: string };
export type NavDraft = { items: NavItemDraft[] };

/** Section -> field -> text. Mirrors `Copy` in lib/content.ts. */
export type CopyDraft = Record<string, Record<string, string>>;

export type CopyField = {
  key: string;
  label: string;
  /** Where it shows, for the hint under the field. */
  hint: string;
  multiline?: boolean;
  max: number;
};

export type CopySection = { key: string; title: string; fields: CopyField[] };

/** Every line of page copy the site reads from `settings.copy`, grouped by
 *  the page it appears on. */
export const COPY_SECTIONS: CopySection[] = [
  {
    key: "home",
    title: "Home page",
    fields: [
      { key: "heroHeading", label: "Main heading", hint: "The large line at the top of the home page.", max: 120 },
      { key: "heroLead", label: "Introduction", hint: "The paragraph under the main heading.", multiline: true, max: 600 },
      { key: "collectionsHeading", label: "Collections heading", hint: "Above the row of collections.", max: 120 },
      { key: "projectsHeading", label: "Projects heading", hint: "Above the featured projects.", max: 120 },
      { key: "eventsHeading", label: "Events heading", hint: "Above the list of events.", max: 120 },
    ],
  },
  {
    key: "footer",
    title: "Footer, on every page",
    fields: [
      { key: "promptHeading", label: "Prompt heading", hint: "The commission prompt at the foot of every page.", max: 120 },
      { key: "promptBody", label: "Prompt text", hint: "The sentence or two under it.", multiline: true, max: 600 },
    ],
  },
  ...(
    [
      ["collections", "Collections page"],
      ["projects", "Projects page"],
      ["events", "Events page"],
      ["contact", "Custom orders page"],
    ] as const
  ).map(([key, title]) => ({
    key,
    title,
    fields: [
      { key: "title", label: "Page title", hint: "The large heading, also the browser tab title.", max: 120 },
      { key: "intro", label: "Introduction", hint: "The paragraph under the title.", multiline: true, max: 1200 },
    ],
  })),
];
