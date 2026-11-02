import { parseProject } from "@/lib/content";
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

export type SectionDraft = { heading: string; body: string };

export type ProjectDraft = {
  slug: string;
  title: string;
  year: string;
  /** What the studio did, in the client's own terms. */
  role: string;
  summary: string;
  /** Lead process photograph. Empty means the motif. */
  image: string;
  /** The story, in order: brief, process, outcome. */
  sections: SectionDraft[];
};

function toDraft(value: unknown): ProjectDraft {
  const raw = isRecord(value) ? value : {};
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  return {
    slug: text(raw.slug),
    title: text(raw.title),
    year: text(raw.year),
    role: text(raw.role),
    summary: text(raw.summary),
    image: text(raw.image),
    sections: sections
      .filter(isRecord)
      .map((section) => ({ heading: text(section.heading), body: text(section.body) })),
  };
}

function toPayload(draft: ProjectDraft) {
  return {
    slug: draft.slug,
    title: draft.title,
    year: draft.year,
    role: draft.role,
    summary: draft.summary,
    ...(draft.image ? { image: draft.image } : {}),
    sections: draft.sections.map((section) => ({ heading: section.heading, body: section.body })),
  };
}

function draftErrors(draft: ProjectDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.title) errors.title = "Give the project a title.";
  checkLength(errors, "title", draft.title, LIMITS.name);
  checkSlug(errors, draft.slug, "brass-cuff-series");
  checkLength(errors, "year", draft.year, 40);
  checkLength(errors, "role", draft.role, LIMITS.short);
  checkLength(errors, "summary", draft.summary, LIMITS.long);
  if (draft.image) checkUrl(errors, "image", draft.image);
  draft.sections.forEach((section, i) => {
    checkLength(errors, `sections.${i}.heading`, section.heading, LIMITS.short);
    checkLength(errors, `sections.${i}.body`, section.body, LIMITS.body);
  });
  return errors;
}

function publishErrors(draft: ProjectDraft): FieldErrors {
  const errors = draftErrors(draft);
  if (!draft.year) errors.year = "Add the year.";
  if (!draft.role) errors.role = "Say what the studio did.";
  if (!draft.summary) errors.summary = "Add the summary for the projects page.";
  draft.sections.forEach((section, i) => {
    // The public reader drops a section missing either half, so publishing
    // one would silently lose it.
    if (!section.heading) errors[`sections.${i}.heading`] = "Add a heading, or remove this section.";
    if (!section.body) errors[`sections.${i}.body`] = "Write the section, or remove it.";
  });

  if (Object.keys(errors).length === 0) {
    const parsed = parseProject(toPayload(draft));
    if (!parsed || parsed.sections.length !== draft.sections.length) {
      errors.form = "The public site would not accept this project as it stands.";
    }
  }
  return errors;
}

export const projectSpec: KindSpec<ProjectDraft> = {
  kind: "project",
  tag: "content:project",
  one: "project",
  many: "projects",
  studioPath: "/studio/projects",
  addressed: true,
  publicPath: (slug) => `/projects/${slug}`,
  slugExample: "brass-cuff-series",
  newPlaceholder: "e.g. Lattice screen",
  toDraft,
  toPayload,
  newDraft: (title, slug) => ({ ...toDraft({ title, slug }), sections: [] }),
  nameOf: (draft) => draft.title,
  slugOf: (draft) => draft.slug,
  detail: (draft) =>
    [draft.year, `${draft.sections.length} ${draft.sections.length === 1 ? "section" : "sections"}`]
      .filter(Boolean)
      .join(" · "),
  draftErrors,
  publishErrors,
};
