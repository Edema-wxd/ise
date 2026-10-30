import type { getSql } from "@/lib/db";
import { parseCollection, TONES } from "@/lib/content";

type Sql = NonNullable<ReturnType<typeof getSql>>;

/*
  Collections as the studio edits them.

  The public readers in lib/content.ts are strict: an entry missing a field is
  dropped. A draft is allowed to be half-written, so the editor works on this
  looser shape, where every text field is a string (possibly empty), and only
  publishing has to pass the public reader's own check.
*/

export type PhotoDraft = { src: string; alt: string };

export type PieceDraft = {
  name: string;
  material: string;
  dimension: string;
  photos: PhotoDraft[];
};

export type CollectionDraft = {
  slug: string;
  name: string;
  summary: string;
  intro: string;
  tone: string;
  /** Lead image for the collection itself. Empty means the motif. */
  image: string;
  pieces: PieceDraft[];
};

export type CollectionEntry = {
  id: number;
  slug: string;
  sortOrder: number;
  draft: CollectionDraft;
  isPublished: boolean;
  /** The draft differs from what the site serves. */
  hasChanges: boolean;
  publishedAt: string | null;
  /** Exact text form of `updated_at`, echoed back on save to catch a
   *  concurrent edit. Text, because a JS Date would drop the microseconds. */
  updatedAt: string;
  deletedAt: string | null;
};

export type Revision = {
  id: number;
  action: string;
  actor: string | null;
  createdAt: string;
  hasPayload: boolean;
};

/** Field errors keyed by path: `name`, `pieces.2.material`, `pieces.0.photos.1.src`. */
export type FieldErrors = Record<string, string>;

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const LIMITS = { slug: 120, name: 120, summary: 200, intro: 1200, field: 160, url: 500 };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
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

/**
 * Reads a stored or submitted payload into the draft shape, without judging
 * it. Unknown keys are dropped; a piece with the pre-photo-list `image` field
 * comes back as a list of one, the same as the public reader treats it.
 */
export function toDraft(value: unknown): CollectionDraft {
  const raw = isRecord(value) ? value : {};
  const pieces = Array.isArray(raw.pieces) ? raw.pieces : [];

  return {
    slug: text(raw.slug),
    name: text(raw.name),
    summary: text(raw.summary),
    intro: text(raw.intro),
    tone: text(raw.tone) || "coral",
    image: text(raw.image),
    pieces: pieces.filter(isRecord).map((piece) => {
      const legacy = text(piece.image);
      const photos = Array.isArray(piece.photos)
        ? piece.photos.filter(isRecord).map((photo) => ({ src: text(photo.src), alt: text(photo.alt) }))
        : legacy
          ? [{ src: legacy, alt: "" }]
          : [];
      return {
        name: text(piece.name),
        material: text(piece.material),
        dimension: text(piece.dimension),
        photos,
      };
    }),
  };
}

/** The JSON stored in `content_entries`: empty optional fields left out, so
 *  the stored payload reads the same as one written by hand. */
export function toPayload(draft: CollectionDraft) {
  return {
    slug: draft.slug,
    name: draft.name,
    summary: draft.summary,
    intro: draft.intro,
    tone: draft.tone,
    ...(draft.image ? { image: draft.image } : {}),
    pieces: draft.pieces.map((piece) => ({
      name: piece.name,
      material: piece.material,
      dimension: piece.dimension,
      photos: piece.photos
        .filter((photo) => photo.src)
        .map((photo) => ({ src: photo.src, ...(photo.alt ? { alt: photo.alt } : {}) })),
    })),
  };
}

function checkUrl(errors: FieldErrors, path: string, value: string) {
  if (value.length > LIMITS.url) errors[path] = `Keep it under ${LIMITS.url} characters.`;
  else if (!/^https:\/\/\S+$/.test(value)) errors[path] = "Paste the full https:// link.";
}

function checkLength(errors: FieldErrors, path: string, value: string, max: number) {
  if (value.length > max) errors[path] = `Keep it under ${max} characters.`;
}

/** What a draft needs before it can be saved at all: a name and a usable
 *  slug, since the slug is the entry's key. Everything else may wait. */
export function draftErrors(draft: CollectionDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.name) errors.name = "Give the collection a name.";
  checkLength(errors, "name", draft.name, LIMITS.name);
  if (!draft.slug) errors.slug = "Add the web address, e.g. engraved-wood.";
  else if (draft.slug.length > LIMITS.slug) errors.slug = `Keep it under ${LIMITS.slug} characters.`;
  else if (!SLUG.test(draft.slug)) {
    errors.slug = "Lowercase letters, numbers and single hyphens only.";
  }
  checkLength(errors, "summary", draft.summary, LIMITS.summary);
  checkLength(errors, "intro", draft.intro, LIMITS.intro);
  if (draft.image) checkUrl(errors, "image", draft.image);
  draft.pieces.forEach((piece, i) => {
    for (const field of ["name", "material", "dimension"] as const) {
      checkLength(errors, `pieces.${i}.${field}`, piece[field], LIMITS.field);
    }
    piece.photos.forEach((photo, j) => {
      if (photo.src) checkUrl(errors, `pieces.${i}.photos.${j}.src`, photo.src);
      checkLength(errors, `pieces.${i}.photos.${j}.alt`, photo.alt, LIMITS.field);
    });
  });
  return errors;
}

/** Everything the public site needs. Publishing is refused until this is
 *  empty, and then double-checked against the public reader itself. */
export function publishErrors(draft: CollectionDraft): FieldErrors {
  const errors = draftErrors(draft);
  if (!draft.summary) errors.summary = "Add the one-line summary for the collections page.";
  if (!draft.intro) errors.intro = "Add the intro for the top of the collection page.";
  if (!(TONES as string[]).includes(draft.tone)) errors.tone = "Pick a tone.";
  draft.pieces.forEach((piece, i) => {
    if (!piece.name) errors[`pieces.${i}.name`] = "Name this piece.";
    if (!piece.material) errors[`pieces.${i}.material`] = "Add the material.";
    if (!piece.dimension) errors[`pieces.${i}.dimension`] = "Add a size.";
    piece.photos.forEach((photo, j) => {
      if (!photo.src) errors[`pieces.${i}.photos.${j}.src`] = "Paste the photo link, or remove this photo.";
    });
  });

  // Belt and braces: whatever passes the rules above must also survive the
  // reader that serves the public page, or it would vanish on publish.
  if (Object.keys(errors).length === 0) {
    const parsed = parseCollection(toPayload(draft));
    if (!parsed || parsed.pieces.length !== draft.pieces.length) {
      errors.form = "The public site would not accept this collection as it stands.";
    }
  }
  return errors;
}

/* ---- Reads ---- */

type Row = {
  id: string | number;
  slug: string;
  sort_order: number;
  draft: unknown;
  is_published: boolean;
  has_changes: boolean;
  published_at: string | null;
  updated_at: string;
  deleted_at: string | null;
};

function toEntry(row: Row): CollectionEntry {
  return {
    id: Number(row.id),
    slug: row.slug,
    sortOrder: row.sort_order,
    draft: toDraft(row.draft),
    isPublished: row.is_published,
    hasChanges: row.has_changes,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** Every collection, live ones in display order, then the deleted ones. */
export async function listCollections(sql: Sql): Promise<CollectionEntry[]> {
  const rows = await sql`
    select id, slug, sort_order, draft,
           published is not null as is_published,
           draft is distinct from published as has_changes,
           published_at::text, updated_at::text, deleted_at::text
      from content_entries
     where kind = 'collection'
     order by deleted_at is not null, sort_order, id
  `;
  return (rows as Row[]).map(toEntry);
}

export async function getCollectionEntry(sql: Sql, id: number): Promise<CollectionEntry | null> {
  const rows = await sql`
    select id, slug, sort_order, draft,
           published is not null as is_published,
           draft is distinct from published as has_changes,
           published_at::text, updated_at::text, deleted_at::text
      from content_entries
     where kind = 'collection' and id = ${id}
  `;
  return rows.length > 0 ? toEntry(rows[0] as Row) : null;
}

export async function listRevisions(sql: Sql, id: number): Promise<Revision[]> {
  const rows = await sql`
    select id, action, actor, created_at::text, payload is not null as has_payload
      from content_revisions
     where target = ${`entry:${id}`}
     order by created_at desc, id desc
     limit 15
  `;
  return (
    rows as { id: string | number; action: string; actor: string | null; created_at: string; has_payload: boolean }[]
  ).map((row) => ({
    id: Number(row.id),
    action: row.action,
    actor: row.actor,
    createdAt: row.created_at,
    hasPayload: row.has_payload,
  }));
}
