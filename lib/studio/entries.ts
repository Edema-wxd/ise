import type { getSql } from "@/lib/db";
import type { KindSpec } from "@/lib/studio/kinds";

type Sql = NonNullable<ReturnType<typeof getSql>>;

/** One content entry as the studio sees it. */
export type Entry<D> = {
  id: number;
  /** The draft's web address, or the row's key for a kind with no pages. */
  slug: string;
  /** Where the live page is, when published: the published payload's own
   *  slug, which differs from `slug` while a renamed address is unpublished.
   *  Always the row's key for a kind with no pages. */
  publishedSlug: string | null;
  sortOrder: number;
  draft: D;
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

type Row = {
  id: string | number;
  slug: string;
  sort_order: number;
  draft: unknown;
  published_slug: string | null;
  is_published: boolean;
  has_changes: boolean;
  published_at: string | null;
  updated_at: string;
  deleted_at: string | null;
};

function toEntry<D>(spec: KindSpec<D>, row: Row): Entry<D> {
  const draft = spec.toDraft(row.draft);
  return {
    id: Number(row.id),
    slug: (spec.addressed && spec.slugOf(draft)) || row.slug,
    publishedSlug: row.is_published ? (spec.addressed ? row.published_slug : row.slug) : null,
    sortOrder: row.sort_order,
    draft,
    isPublished: row.is_published,
    hasChanges: row.has_changes,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** Every entry of one kind: live ones in display order, then the deleted ones. */
export async function listEntries<D>(sql: Sql, spec: KindSpec<D>): Promise<Entry<D>[]> {
  const rows = await sql`
    select id, slug, sort_order, draft, published->>'slug' as published_slug,
           published is not null as is_published,
           draft is distinct from published as has_changes,
           published_at::text, updated_at::text, deleted_at::text
      from content_entries
     where kind = ${spec.kind}
     order by deleted_at is not null, sort_order, id
  `;
  return (rows as Row[]).map((row) => toEntry(spec, row));
}

export async function getEntry<D>(sql: Sql, spec: KindSpec<D>, id: number): Promise<Entry<D> | null> {
  const rows = await sql`
    select id, slug, sort_order, draft, published->>'slug' as published_slug,
           published is not null as is_published,
           draft is distinct from published as has_changes,
           published_at::text, updated_at::text, deleted_at::text
      from content_entries
     where kind = ${spec.kind} and id = ${id}
  `;
  return rows.length > 0 ? toEntry(spec, rows[0] as Row) : null;
}

/**
 * What, if anything, already claims this slug within the kind, other than
 * entry `id`.
 *
 * For an addressed kind, a web address is claimed by any entry's draft or live
 * version, deleted ones included: a deleted entry keeps its address so that
 * restoring it cannot collide. The unique index on `content_entries.slug`
 * holds one value per row, so it cannot see a live address and a renamed
 * draft address at the same time; this check covers both. The index still
 * catches a race between two saves.
 *
 * For a kind without pages the slug is only the row's key, so only that is
 * checked.
 */
export async function slugClaim<D>(
  sql: Sql,
  spec: KindSpec<D>,
  id: number | null,
  slug: string,
): Promise<"live" | "deleted" | null> {
  const rows = await sql`
    select deleted_at is not null as deleted
      from content_entries
     where kind = ${spec.kind}
       and id is distinct from ${id}
       and (slug = ${slug} or draft->>'slug' = ${slug} or published->>'slug' = ${slug})
     order by deleted_at is not null
     limit 1
  `;
  if (rows.length === 0) return null;
  return (rows[0] as { deleted: boolean }).deleted ? "deleted" : "live";
}

/** The message for a claimed address, pointing at Deleted when that is where
 *  the other entry is. */
export function slugTakenMessage<D>(spec: KindSpec<D>, slug: string, claim: "live" | "deleted"): string {
  return claim === "deleted"
    ? `A deleted ${spec.one} still uses ${spec.publicPath(slug)}. Restore it from Deleted, or pick another address.`
    : `Another ${spec.one} already uses ${spec.publicPath(slug)}.`;
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
