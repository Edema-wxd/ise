/*
  Helpers every content kind's studio spec shares: reading loose payloads,
  slugs, and the length and link checks behind field errors.
*/

/** Field errors keyed by path: `title`, `pieces.2.material`, `sections.0.body`. */
export type FieldErrors = Record<string, string>;

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const LIMITS = {
  slug: 120,
  name: 120,
  summary: 200,
  short: 160,
  long: 1200,
  body: 4000,
  url: 500,
};

export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Turns anything into a slug candidate: "Engraved Wood!" -> "engraved-wood". */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, LIMITS.slug);
}

export function checkUrl(errors: FieldErrors, path: string, value: string) {
  if (value.length > LIMITS.url) errors[path] = `Keep it under ${LIMITS.url} characters.`;
  else if (!/^https:\/\/\S+$/.test(value)) errors[path] = "Paste the full https:// link.";
}

export function checkLength(errors: FieldErrors, path: string, value: string, max: number) {
  if (value.length > max) errors[path] = `Keep it under ${max} characters.`;
}

/** A web address: required, lowercase, hyphenated. */
export function checkSlug(errors: FieldErrors, slug: string, example: string) {
  if (!slug) errors.slug = `Add the web address, e.g. ${example}.`;
  else if (slug.length > LIMITS.slug) errors.slug = `Keep it under ${LIMITS.slug} characters.`;
  else if (!SLUG.test(slug)) errors.slug = "Lowercase letters, numbers and single hyphens only.";
}

/**
 * How the studio handles one kind of content entry. The list, the editor
 * page, history and every action are written once against this; a kind only
 * says what its fields are and what it needs to save and to publish.
 *
 * `D` is the kind's draft shape: every text field a string, possibly empty,
 * because a draft may be half-written. Only publishing has to pass the
 * public reader's own check.
 */
export type KindSpec<D> = {
  kind: "collection" | "project" | "event";
  /** The public readers' cache tag, invalidated when what visitors see changes. */
  tag: string;
  one: string;
  many: string;
  /** Studio route: /studio/collections. */
  studioPath: string;
  /**
   * Whether the entry's slug is a web address the studio edits, carried in
   * the payload. Events have no page of their own: their slug is an internal
   * key, set from the title once at creation and never shown.
   */
  addressed: boolean;
  /** Where visitors see it: its own page, or the list it appears on. */
  publicPath: (slug: string) => string;
  /** Example address for the slug error message. */
  slugExample: string;
  /** Placeholder for the "New …" field on the list page. */
  newPlaceholder: string;
  toDraft: (value: unknown) => D;
  toPayload: (draft: D) => Record<string, unknown>;
  newDraft: (name: string, slug: string) => D;
  nameOf: (draft: D) => string;
  /** The draft's address; "" for a kind that is not addressed. */
  slugOf: (draft: D) => string;
  /** One line for the list: "4 pieces", "2024 · 3 sections". */
  detail: (draft: D) => string;
  draftErrors: (draft: D) => FieldErrors;
  publishErrors: (draft: D) => FieldErrors;
};
