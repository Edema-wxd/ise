#!/usr/bin/env node
/**
 * Writes the seed content into `content_entries` and `settings`.
 *
 * Insert-only: every statement is `on conflict do nothing`, so running this
 * twice changes nothing and it can never overwrite what the studio has
 * edited. To reset an entry deliberately, delete the row and re-run.
 *
 * Each entry is seeded as both draft and published, because this copy is what
 * the site serves today — seeding it unpublished would blank the live pages.
 *
 *   npm run db:seed
 */
import { neon } from "@neondatabase/serverless";
import * as seed from "../lib/content-seed.ts";

// Direct connection for writes, per .env.example; the pooled host is for the app.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set.\n" +
      "Copy .env.example to .env.local and run `neon env pull`, then: npm run db:seed",
  );
  process.exit(1);
}

const sql = neon(url);

/** Events have no slug of their own, so one is derived from the title. */
function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

async function putSetting(key, value) {
  await sql`
    insert into settings (key, draft, published, published_at)
    values (${key}, ${JSON.stringify(value)}, ${JSON.stringify(value)}, now())
    on conflict (key) do nothing
  `;
}

async function putEntry(kind, slug, order, payload) {
  await sql`
    insert into content_entries (kind, slug, sort_order, draft, published, published_at)
    values (
      ${kind}, ${slug}, ${order},
      ${JSON.stringify(payload)}, ${JSON.stringify(payload)}, now()
    )
    on conflict (kind, slug) do nothing
  `;
}

for (const [key, value] of [
  ["site", seed.SITE],
  ["nav", seed.NAV],
  ["logo", seed.LOGO],
  ["copy", seed.COPY],
]) {
  await putSetting(key, value);
  console.log(`settings: ${key}`);
}

for (const [index, collection] of seed.COLLECTIONS.entries()) {
  await putEntry("collection", collection.slug, index, collection);
  console.log(`collection: ${collection.slug}`);
}

for (const [index, project] of seed.PROJECTS.entries()) {
  await putEntry("project", project.slug, index, project);
  console.log(`project: ${project.slug}`);
}

for (const [index, event] of seed.EVENTS.entries()) {
  await putEntry("event", slugify(event.title), index, event);
  console.log(`event: ${slugify(event.title)}`);
}

console.log("seed complete");
