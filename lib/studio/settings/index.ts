import * as seed from "@/lib/content-seed";
import { checkLength, isRecord, text, type FieldErrors } from "../kinds/shared";
import {
  COPY_SECTIONS,
  type CopyDraft,
  type NavDraft,
  type SettingKey,
  type SiteDraft,
} from "./fields";

export * from "./fields";

/**
 * How the studio handles one site-wide setting: one row in `settings`, with
 * the same draft/published split, history and publish step as the content
 * kinds, but a single document rather than a list.
 *
 * The public readers (`getSite`, `getNav`, `getCopy` in lib/content.ts) fall
 * back to the seed when a stored value is incomplete. Publishing here
 * requires every field instead, so what the editor shows is what goes live,
 * never a silent fallback.
 */
export type SettingSpec<D> = {
  key: SettingKey;
  /** The public reader's cache tag. */
  tag: string;
  title: string;
  /** One line for the settings index. */
  description: string;
  /** The value to start from when the row has never been saved. */
  seed: () => unknown;
  toDraft: (value: unknown) => D;
  toPayload: (draft: D) => unknown;
  draftErrors: (draft: D) => FieldErrors;
  publishErrors: (draft: D) => FieldErrors;
};

/* ---- Site ---- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;

function siteDraftErrors(draft: SiteDraft): FieldErrors {
  const errors: FieldErrors = {};
  checkLength(errors, "name", draft.name, 80);
  checkLength(errors, "tagline", draft.tagline, 200);
  if (draft.url) {
    let ok = false;
    try {
      const url = new URL(draft.url);
      ok = url.protocol === "https:" && (url.pathname === "/" || url.pathname === "") && !url.search;
    } catch {
      ok = false;
    }
    if (!ok) errors.url = "The full address, like https://www.isestudiong.com, with nothing after it.";
  }
  if (draft.email && !EMAIL.test(draft.email)) errors.email = "That email address is missing something.";
  if (draft.instagram && !HANDLE.test(draft.instagram)) {
    errors.instagram = "Just the handle: letters, numbers, dots and underscores.";
  }
  return errors;
}

const site: SettingSpec<SiteDraft> = {
  key: "site",
  tag: "content:settings:site",
  title: "Site details",
  description: "The studio's name, web address, tagline, email and Instagram.",
  seed: () => seed.SITE,
  toDraft: (value) => {
    const raw = isRecord(value) ? value : {};
    return {
      name: text(raw.name),
      // Stored without a trailing slash: the sitemap appends paths to it.
      url: text(raw.url).replace(/\/+$/, ""),
      tagline: text(raw.tagline),
      email: text(raw.email),
      instagram: text(raw.instagram).replace(/^@/, ""),
    };
  },
  toPayload: (draft) => ({ ...draft }),
  draftErrors: siteDraftErrors,
  publishErrors: (draft) => {
    const errors = siteDraftErrors(draft);
    const required: Record<keyof SiteDraft, string> = {
      name: "Add the studio's name.",
      url: "Add the site's address.",
      tagline: "Add the tagline.",
      email: "Add the email visitors should write to.",
      instagram: "Add the Instagram handle.",
    };
    for (const [field, message] of Object.entries(required)) {
      if (!draft[field as keyof SiteDraft]) errors[field] = message;
    }
    return errors;
  },
};

/* ---- Navigation ---- */

const INTERNAL = /^\/[a-z0-9\-/]*$/;
const MAX_NAV = 8;

function navDraftErrors(draft: NavDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (draft.items.length > MAX_NAV) errors.form = `Keep the menu to ${MAX_NAV} entries or fewer.`;
  draft.items.forEach((item, i) => {
    checkLength(errors, `items.${i}.label`, item.label, 40);
    if (item.href && !INTERNAL.test(item.href) && !/^https:\/\/\S+$/.test(item.href)) {
      errors[`items.${i}.href`] = "A page on this site, like /collections, or a full https:// link.";
    }
  });
  return errors;
}

const nav: SettingSpec<NavDraft> = {
  key: "nav",
  tag: "content:settings:nav",
  title: "Navigation",
  description: "The links in the header and footer, in order.",
  seed: () => seed.NAV,
  /* Stored as a bare array, the shape getNav() reads; the editor posts
     { items }. Both arrive here. */
  toDraft: (value) => ({
    items: (Array.isArray(value) ? value : isRecord(value) && Array.isArray(value.items) ? value.items : [])
      .filter(isRecord)
      .map((item) => ({ href: text(item.href), label: text(item.label) })),
  }),
  toPayload: (draft) => draft.items.map((item) => ({ href: item.href, label: item.label })),
  draftErrors: navDraftErrors,
  publishErrors: (draft) => {
    const errors = navDraftErrors(draft);
    if (draft.items.length === 0) errors.form = "The menu needs at least one link.";
    draft.items.forEach((item, i) => {
      if (!item.label) errors[`items.${i}.label`] = "Add the link text, or remove this link.";
      if (!item.href) errors[`items.${i}.href`] = "Add where it goes, or remove this link.";
    });
    return errors;
  },
};

/* ---- Page copy ---- */

function copyDraftErrors(draft: CopyDraft): FieldErrors {
  const errors: FieldErrors = {};
  for (const section of COPY_SECTIONS) {
    for (const field of section.fields) {
      checkLength(errors, `${section.key}.${field.key}`, draft[section.key]?.[field.key] ?? "", field.max);
    }
  }
  return errors;
}

const copy: SettingSpec<CopyDraft> = {
  key: "copy",
  tag: "content:settings:copy",
  title: "Page copy",
  description: "Headings and introductions on the home, list and custom-orders pages, and the footer prompt.",
  seed: () => seed.COPY,
  /* Only the known fields, each a string. A field the stored value lacks
     starts from the seed, because that is what the live page shows for it
     (getCopy merges against the seed field by field). */
  toDraft: (value) => {
    const raw = isRecord(value) ? value : {};
    const shipped = seed.COPY as unknown as CopyDraft;
    return Object.fromEntries(
      COPY_SECTIONS.map((section) => {
        const stored = isRecord(raw[section.key]) ? (raw[section.key] as Record<string, unknown>) : {};
        return [
          section.key,
          Object.fromEntries(
            section.fields.map((field) => [
              field.key,
              field.key in stored ? text(stored[field.key]) : (shipped[section.key]?.[field.key] ?? ""),
            ]),
          ),
        ];
      }),
    );
  },
  toPayload: (draft) => draft,
  draftErrors: copyDraftErrors,
  publishErrors: (draft) => {
    const errors = copyDraftErrors(draft);
    for (const section of COPY_SECTIONS) {
      for (const field of section.fields) {
        if (!draft[section.key]?.[field.key]) {
          errors[`${section.key}.${field.key}`] = "Write this line; an empty one would fall back to the default text.";
        }
      }
    }
    return errors;
  },
};

export const SETTINGS: Record<SettingKey, SettingSpec<any>> = { site, nav, copy };

export function isSettingKey(value: unknown): value is SettingKey {
  return typeof value === "string" && Object.hasOwn(SETTINGS, value);
}
