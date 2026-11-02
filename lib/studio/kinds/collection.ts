import { parseCollection, TONES } from "@/lib/content";
import {
  checkLength,
  checkSlug,
  checkUrl,
  isRecord,
  LIMITS,
  text,
  type FieldErrors,
  type KindSpec,
} from "./shared";

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

/**
 * Reads a stored or submitted payload into the draft shape, without judging
 * it. Unknown keys are dropped; a piece with the pre-photo-list `image` field
 * comes back as a list of one, the same as the public reader treats it.
 */
function toDraft(value: unknown): CollectionDraft {
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
function toPayload(draft: CollectionDraft) {
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

/** What a draft needs before it can be saved at all: a name and a usable
 *  slug, since the slug is the entry's key. Everything else may wait. */
function draftErrors(draft: CollectionDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.name) errors.name = "Give the collection a name.";
  checkLength(errors, "name", draft.name, LIMITS.name);
  checkSlug(errors, draft.slug, "engraved-wood");
  checkLength(errors, "summary", draft.summary, LIMITS.summary);
  checkLength(errors, "intro", draft.intro, LIMITS.long);
  if (draft.image) checkUrl(errors, "image", draft.image);
  draft.pieces.forEach((piece, i) => {
    for (const field of ["name", "material", "dimension"] as const) {
      checkLength(errors, `pieces.${i}.${field}`, piece[field], LIMITS.short);
    }
    piece.photos.forEach((photo, j) => {
      if (photo.src) checkUrl(errors, `pieces.${i}.photos.${j}.src`, photo.src);
      checkLength(errors, `pieces.${i}.photos.${j}.alt`, photo.alt, LIMITS.short);
    });
  });
  return errors;
}

/** Everything the public site needs. Publishing is refused until this is
 *  empty, and then double-checked against the public reader itself. */
function publishErrors(draft: CollectionDraft): FieldErrors {
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

export const collectionSpec: KindSpec<CollectionDraft> = {
  kind: "collection",
  tag: "content:collection",
  one: "collection",
  many: "collections",
  studioPath: "/studio/collections",
  addressed: true,
  publicPath: (slug) => `/collections/${slug}`,
  slugExample: "engraved-wood",
  newPlaceholder: "e.g. Beaded work",
  toDraft,
  toPayload,
  newDraft: (name, slug) => ({ ...toDraft({ name, slug }), pieces: [] }),
  nameOf: (draft) => draft.name,
  slugOf: (draft) => draft.slug,
  detail: (draft) => `${draft.pieces.length} ${draft.pieces.length === 1 ? "piece" : "pieces"}`,
  draftErrors,
  publishErrors,
};
