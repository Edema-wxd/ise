import { cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import type { Tone } from "@/components/motif-field";
import { getSql } from "@/lib/db";
import * as seed from "./content-seed";

/*
  The site's content, read from Postgres.

  Every route is a template over these readers. Content itself is edited in
  the studio and lives in `content_entries` and `settings` (db/002_content.sql);
  `content-seed.ts` holds the initial copy and is the fallback when the
  database is unreachable.

  Each reader is a `use cache` scope tagged by what it reads, so the public
  pages still prerender and a publish in the studio invalidates exactly the
  tags it touched. `draftMode().isEnabled` is the one runtime value readable
  inside a cache scope, and turning draft mode on makes these scopes
  re-execute per request without writing to the cache — which is what the
  studio's preview needs and why the public pages stay static.
*/

export type Logo = { src: string; width: number; height: number; alt: string };

export type Site = {
  name: string;
  /** Canonical origin, used by metadata and the sitemap. */
  url: string;
  tagline: string;
  email: string;
  instagram: string;
};

export type NavItem = {
  href: string;
  label: string;
  /** Shown as a menu under this entry in the header. */
  children?: NavItem[];
};

/** Copy that belongs to a page rather than to a collection or a project. */
export type Copy = {
  home: {
    heroHeading: string;
    heroLead: string;
    collectionsHeading: string;
    projectsHeading: string;
    eventsHeading: string;
  };
  footer: { promptHeading: string; promptBody: string };
  collections: { title: string; intro: string };
  projects: { title: string; intro: string };
  events: { title: string; intro: string };
  contact: { title: string; intro: string };
};

/** One photograph on UploadThing. */
export type Photo = {
  /** `https://<APP_ID>.ufs.sh/f/<FILE_KEY>`. */
  src: string;
  /** What this shot shows, for someone who cannot see it: "Wide cuff, worn on
   *  the wrist". Defaults to the piece's name and material, which is fine for
   *  one photo and too vague for several. */
  alt?: string;
};

/** One thing in a collection. */
export type Piece = {
  name: string;
  /** Material first: it is the thing a buyer asks about before anything else. */
  material: string;
  /** Free text, because a cuff is measured differently from a stool. */
  dimension: string;
  /** Lead photo first. Empty or absent means the motif stands in. */
  photos?: Photo[];
};

export type Collection = {
  slug: string;
  name: string;
  /** One line, for the collections index. */
  summary: string;
  /** Two or three sentences, for the top of the collection page. */
  intro: string;
  tone: Tone;
  /** UploadThing URL for the collection's lead image. */
  image?: string;
  pieces: Piece[];
};

export type Project = {
  slug: string;
  title: string;
  year: string;
  /** What the studio did, in the client's own terms. */
  role: string;
  summary: string;
  /** UploadThing URL for the lead process photograph. */
  image?: string;
  /** The story, in order: brief, process, outcome. Headings are the content. */
  sections: { heading: string; body: string }[];
};

export type Event = {
  title: string;
  /** Both optional: an event is listed as soon as its name is confirmed, and
   *  gains its venue and year when those are. */
  venue?: string;
  year?: string;
  note: string;
  /** UploadThing URL for the install photograph. */
  image?: string;
};

/** Returns the venue-and-year line, or a single honest stand-in when neither
 *  has been confirmed, so an unconfirmed event never says "to be confirmed"
 *  twice in one line. */
export function eventMeta(event: Event): string {
  const parts = [event.venue, event.year].filter(Boolean);
  return parts.length > 0 ? `${parts.join(". ")}.` : "Venue and dates to come.";
}

/* ---- Reading ---- */

type Kind = "collection" | "project" | "event";

/**
 * Returns the payload of every entry of one kind, in display order.
 *
 * Published payloads for the public site; drafts when the studio is previewing.
 * An empty array is a real answer — it means nothing is published — so it is
 * returned as is. The seed is used only when there is no database to ask,
 * which keeps the site serving on an unconfigured or unreachable Postgres,
 * the same bargain `lib/db.ts` makes.
 */
async function readPayloads(kind: Kind): Promise<unknown[] | null> {
  const sql = getSql();
  if (!sql) return null;

  const { isEnabled: preview } = await draftMode();

  try {
    const rows = preview
      ? await sql`
          select draft as payload
          from content_entries
          where kind = ${kind} and deleted_at is null
          order by sort_order, id
        `
      : await sql`
          select published as payload
          from content_entries
          where kind = ${kind} and deleted_at is null and published is not null
          order by sort_order, id
        `;

    return rows.map((row) => (row as { payload: unknown }).payload);
  } catch (error) {
    // Same reasoning as the inquiry form: the message can carry connection
    // details, so it stays in the log and the visitor still gets a site.
    console.error(`readPayloads(${kind}): query failed`, error);
    return null;
  }
}

/** Returns one settings value, or null when there is no database to ask. */
async function readSetting(key: string): Promise<unknown | null> {
  const sql = getSql();
  if (!sql) return null;

  const { isEnabled: preview } = await draftMode();

  try {
    const rows = preview
      ? await sql`select draft as value from settings where key = ${key}`
      : await sql`select published as value from settings where key = ${key}`;

    const value = rows.length > 0 ? (rows[0] as { value: unknown }).value : null;
    return value ?? null;
  } catch (error) {
    console.error(`readSetting(${key}): query failed`, error);
    return null;
  }
}

/* ---- Parsing ----

   Postgres hands back `jsonb` as `unknown`, and these rows were written by the
   studio rather than by the compiler, so every payload is checked on the way
   in. A row that does not match its type is dropped and logged rather than
   rendered half-built: one bad entry should cost its own card, not the page.
*/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function optionalStr(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

const TONES: Tone[] = ["coral", "mauve", "peach", "eggplant", "brick", "paper"];

function tone(value: unknown): Tone | null {
  return typeof value === "string" && (TONES as string[]).includes(value)
    ? (value as Tone)
    : null;
}

function asPhoto(value: unknown): Photo | null {
  if (!isRecord(value)) return null;
  const src = str(value.src);
  return src ? { src, alt: optionalStr(value.alt) } : null;
}

function asPiece(value: unknown): Piece | null {
  if (!isRecord(value)) return null;
  const name = str(value.name);
  const material = str(value.material);
  const dimension = str(value.dimension);
  if (!name || !material || !dimension) return null;

  // A piece saved before photo lists has a single `image`; read it as a list
  // of one rather than dropping it, so existing rows need no migration.
  const legacy = optionalStr(value.image);
  const photos = Array.isArray(value.photos)
    ? value.photos.map(asPhoto).filter((photo): photo is Photo => photo !== null)
    : legacy
      ? [{ src: legacy }]
      : [];

  return { name, material, dimension, photos };
}

function asCollection(value: unknown): Collection | null {
  if (!isRecord(value)) return null;
  const slug = str(value.slug);
  const name = str(value.name);
  const summary = str(value.summary);
  const intro = str(value.intro);
  const t = tone(value.tone);
  if (!slug || !name || !summary || !intro || !t) return null;

  const pieces = Array.isArray(value.pieces)
    ? value.pieces.map(asPiece).filter((piece): piece is Piece => piece !== null)
    : [];

  return { slug, name, summary, intro, tone: t, image: optionalStr(value.image), pieces };
}

function asProject(value: unknown): Project | null {
  if (!isRecord(value)) return null;
  const slug = str(value.slug);
  const title = str(value.title);
  const year = str(value.year);
  const role = str(value.role);
  const summary = str(value.summary);
  if (!slug || !title || !year || !role || !summary) return null;

  const sections = Array.isArray(value.sections)
    ? value.sections
        .map((section) => {
          if (!isRecord(section)) return null;
          const heading = str(section.heading);
          const body = str(section.body);
          return heading && body ? { heading, body } : null;
        })
        .filter((section): section is { heading: string; body: string } => section !== null)
    : [];

  return { slug, title, year, role, summary, image: optionalStr(value.image), sections };
}

function asEvent(value: unknown): Event | null {
  if (!isRecord(value)) return null;
  const title = str(value.title);
  const note = str(value.note);
  if (!title || !note) return null;
  return {
    title,
    note,
    venue: optionalStr(value.venue),
    year: optionalStr(value.year),
    image: optionalStr(value.image),
  };
}

function parseAll<T>(payloads: unknown[], parse: (value: unknown) => T | null, kind: Kind): T[] {
  const parsed: T[] = [];
  for (const payload of payloads) {
    const value = parse(payload);
    if (value) parsed.push(value);
    else console.error(`content: dropped a malformed ${kind} entry`);
  }
  return parsed;
}

/* ---- Readers ---- */

export async function getSite(): Promise<Site> {
  "use cache";
  cacheTag("content:settings:site");

  const value = await readSetting("site");
  if (!isRecord(value)) return seed.SITE;

  const name = str(value.name);
  const url = str(value.url);
  const tagline = str(value.tagline);
  const email = str(value.email);
  const instagram = str(value.instagram);
  if (!name || !url || !tagline || !email || !instagram) {
    console.error("content: settings.site is malformed, using the seed");
    return seed.SITE;
  }

  return { name, url, tagline, email, instagram };
}

export async function getNav(): Promise<NavItem[]> {
  "use cache";
  cacheTag("content:settings:nav");

  const value = await readSetting("nav");
  if (!Array.isArray(value)) return seed.NAV;

  const items = value
    .map((item) => {
      if (!isRecord(item)) return null;
      const href = str(item.href);
      const label = str(item.label);
      return href && label ? { href, label } : null;
    })
    .filter((item): item is NavItem => item !== null);

  // An empty nav is a broken site rather than an editorial choice.
  return items.length > 0 ? items : seed.NAV;
}

/**
 * The nav with every collection listed under the `/collections` entry, so a
 * collection published in the studio joins the header menu on its own.
 *
 * Kept apart from `getNav()` so each stays cached under its own tag: editing
 * the nav and publishing a collection invalidate different things.
 */
export function withCollectionsMenu(nav: NavItem[], collections: Collection[]): NavItem[] {
  return nav.map((item) =>
    item.href === "/collections"
      ? {
          ...item,
          children: [
            { href: "/collections", label: "All collections" },
            ...collections.map((collection) => ({
              href: `/collections/${collection.slug}`,
              label: collection.name,
            })),
          ],
        }
      : item,
  );
}

export async function getLogo(): Promise<Logo | null> {
  "use cache";
  cacheTag("content:settings:logo");

  const value = await readSetting("logo");
  if (!isRecord(value)) return seed.LOGO;

  const src = str(value.src);
  const alt = str(value.alt);
  const width = typeof value.width === "number" ? value.width : null;
  const height = typeof value.height === "number" ? value.height : null;
  if (!src || !alt || !width || !height) return null;

  return { src, alt, width, height };
}

export async function getCopy(): Promise<Copy> {
  "use cache";
  cacheTag("content:settings:copy");

  const value = await readSetting("copy");
  if (!isRecord(value)) return seed.COPY;

  // Copy is merged key by key against the seed: a field the studio has not
  // filled in should fall back to the shipped line, not blank the page.
  const section = <K extends keyof Copy>(key: K): Copy[K] => {
    const raw = value[key];
    if (!isRecord(raw)) return seed.COPY[key];
    const merged = { ...seed.COPY[key] } as Record<string, string>;
    for (const field of Object.keys(merged)) {
      const text = str(raw[field]);
      if (text) merged[field] = text;
    }
    return merged as Copy[K];
  };

  return {
    home: section("home"),
    footer: section("footer"),
    collections: section("collections"),
    projects: section("projects"),
    events: section("events"),
    contact: section("contact"),
  };
}

export async function getCollections(): Promise<Collection[]> {
  "use cache";
  cacheTag("content:collection");

  const payloads = await readPayloads("collection");
  if (payloads === null) return seed.COLLECTIONS;
  return parseAll(payloads, asCollection, "collection");
}

export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheTag("content:project");

  const payloads = await readPayloads("project");
  if (payloads === null) return seed.PROJECTS;
  return parseAll(payloads, asProject, "project");
}

export async function getEvents(): Promise<Event[]> {
  "use cache";
  cacheTag("content:event");

  const payloads = await readPayloads("event");
  if (payloads === null) return seed.EVENTS;
  return parseAll(payloads, asEvent, "event");
}

/** Filtered from the list rather than queried on its own: the list is already
 *  cached under its tag, and a per-slug cache entry would need its own. */
export async function getCollection(slug: string): Promise<Collection | undefined> {
  return (await getCollections()).find((collection) => collection.slug === slug);
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getProjects()).find((project) => project.slug === slug);
}

/*
  Params for the two dynamic routes.

  Under Cache Components `generateStaticParams` must return at least one param,
  so the route can prerender a non-empty shell; an empty array is a build
  error. Paths that are not returned are still served — Next serves the shell
  and fills it in once the param is known — so these return what is published
  and fall back to the seed's first slug when nothing is. That path then 404s
  through `notFound()`, which is the right answer: there is no such entry.
*/

export async function getCollectionParams(): Promise<{ collection: string }[]> {
  const collections = await getCollections();
  return collections.length > 0
    ? collections.map((collection) => ({ collection: collection.slug }))
    : [{ collection: seed.COLLECTIONS[0].slug }];
}

export async function getProjectParams(): Promise<{ slug: string }[]> {
  const projects = await getProjects();
  return projects.length > 0
    ? projects.map((project) => ({ slug: project.slug }))
    : [{ slug: seed.PROJECTS[0].slug }];
}
