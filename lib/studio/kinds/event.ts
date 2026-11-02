import { parseEvent } from "@/lib/content";
import { checkLength, checkUrl, isRecord, LIMITS, text, type FieldErrors, type KindSpec } from "./shared";

export type EventDraft = {
  title: string;
  /** Both optional: an event is listed as soon as its name is confirmed. */
  venue: string;
  year: string;
  note: string;
  /** Install photograph. Empty means the motif. */
  image: string;
};

function toDraft(value: unknown): EventDraft {
  const raw = isRecord(value) ? value : {};
  return {
    title: text(raw.title),
    venue: text(raw.venue),
    year: text(raw.year),
    note: text(raw.note),
    image: text(raw.image),
  };
}

/** No slug: events have no page of their own, so their key lives only in
 *  the row (`content_entries.slug`), never in the payload. */
function toPayload(draft: EventDraft) {
  return {
    title: draft.title,
    note: draft.note,
    ...(draft.venue ? { venue: draft.venue } : {}),
    ...(draft.year ? { year: draft.year } : {}),
    ...(draft.image ? { image: draft.image } : {}),
  };
}

function draftErrors(draft: EventDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.title) errors.title = "Give the event a name.";
  checkLength(errors, "title", draft.title, LIMITS.name);
  checkLength(errors, "venue", draft.venue, LIMITS.short);
  checkLength(errors, "year", draft.year, 40);
  checkLength(errors, "note", draft.note, LIMITS.long);
  if (draft.image) checkUrl(errors, "image", draft.image);
  return errors;
}

function publishErrors(draft: EventDraft): FieldErrors {
  const errors = draftErrors(draft);
  if (!draft.note) errors.note = "Add a line about the event for the events page.";
  if (Object.keys(errors).length === 0 && !parseEvent(toPayload(draft))) {
    errors.form = "The public site would not accept this event as it stands.";
  }
  return errors;
}

export const eventSpec: KindSpec<EventDraft> = {
  kind: "event",
  tag: "content:event",
  one: "event",
  many: "events",
  studioPath: "/studio/events",
  addressed: false,
  // Events are listed together on one page, never on their own.
  publicPath: () => "/events",
  slugExample: "",
  newPlaceholder: "e.g. Lagos Design Week",
  toDraft,
  toPayload,
  newDraft: (title) => toDraft({ title }),
  nameOf: (draft) => draft.title,
  slugOf: () => "",
  detail: (draft) => [draft.venue, draft.year].filter(Boolean).join(" · ") || "Venue and dates to come",
  draftErrors,
  publishErrors,
};
