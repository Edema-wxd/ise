"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSql } from "@/lib/db";
import { slugClaim, slugTakenMessage } from "@/lib/studio/entries";
import { isKind, KINDS, slugify, type FieldErrors, type KindSpec } from "@/lib/studio/kinds";
import { getStudioAccess } from "@/lib/studio/session";
import type { EditorState, NewEntryState } from "./state";

/*
  The studio's writes, for every kind of content entry. Each form says which
  kind it edits in a hidden `kind` field, checked against the known kinds.

  Every action here is a public POST endpoint, whatever page it was rendered
  on, so each one re-checks access itself before touching a row.

  Each write and its `content_revisions` row go in one statement (a CTE), so
  the history can never miss a change.

  `updated_at` is the draft's version: it moves only when the draft changes
  (save, publish, discard, load from history), because the editor treats a
  new version as "the draft was replaced". Unpublish, delete and restore
  leave the draft alone, so they leave `updated_at` alone too.

  For a kind with pages, `content_entries.slug` holds the live address while
  an entry is published and the draft's address otherwise, so a renamed
  draft never frees the live URL for another entry; `slugClaim()` checks a
  new address against every draft, live and deleted address before it is
  used. For a kind without pages (events) the slug is only the row's key: set
  once from the title at creation, never changed. `coalesce(…->>'slug', slug)`
  below is what keeps it: those payloads carry no slug.

  The public cache is invalidated only when what visitors see changes:
  publish, unpublish, delete, restore and reorder. A saved draft is
  invisible to the site, so it invalidates nothing.
*/

const SIGNED_OUT = "You are signed out, or this account is not on the studio list.";

async function access() {
  const sql = getSql();
  const studio = await getStudioAccess();
  if (!sql || !studio.ok) return null;
  return { sql, actor: studio.email };
}

function specOf(form: FormData): KindSpec<any> | null {
  const kind = form.get("kind");
  return isKind(kind) ? KINDS[kind] : null;
}

function int(form: FormData, field: string): number | null {
  const value = Number(form.get(field));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

/* ---- Create ---- */

export async function createEntry(_previous: NewEntryState, form: FormData): Promise<NewEntryState> {
  const spec = specOf(form);
  if (!spec) return { error: "That form is out of date. Reload the page." };
  const ctx = await access();
  if (!ctx) return { error: SIGNED_OUT };

  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: `Give the new ${spec.one} a name.` };
  const base = slugify(name);
  if (!base) return { error: "Use at least one letter or number in the name." };

  let slug = base;
  const claim = await slugClaim(ctx.sql, spec, null, slug);
  if (claim && spec.addressed) {
    return { error: `${slugTakenMessage(spec, slug, claim)} Pick another name.` };
  }
  if (claim) {
    // No page, so the key is internal: number it rather than refuse the name.
    for (let n = 2; n < 100; n++) {
      slug = `${base.slice(0, 110)}-${n}`;
      if (!(await slugClaim(ctx.sql, spec, null, slug))) break;
    }
  }

  const draft = JSON.stringify(spec.toPayload(spec.newDraft(name, slug)));

  let id: number;
  try {
    // New entries go to the end of the list, unpublished.
    const rows = await ctx.sql`
      with created as (
        insert into content_entries (kind, slug, sort_order, draft)
        values (
          ${spec.kind}, ${slug},
          (select coalesce(max(sort_order), -1) + 1 from content_entries where kind = ${spec.kind}),
          ${draft}::jsonb
        )
        returning id, draft
      ), rev as (
        insert into content_revisions (target, action, payload, actor)
        select 'entry:' || id, 'save', draft, ${ctx.actor} from created
      )
      select id from created
    `;
    id = Number((rows[0] as { id: string | number }).id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: `Another ${spec.one} already uses ${spec.publicPath(slug)}. Pick another name.` };
    }
    console.error("createEntry: insert failed", error);
    return { error: "That did not save. Try again." };
  }

  redirect(`${spec.studioPath}/${id}`);
}

/* ---- Save and publish ---- */

export async function saveEntry(previous: EditorState, form: FormData): Promise<EditorState> {
  const stale = { ...previous, status: "error" as const, errors: {}, message: "That form is out of date. Reload the page." };
  const spec = specOf(form);
  if (!spec) return stale;
  const ctx = await access();
  if (!ctx) return { ...previous, status: "error", errors: {}, message: SIGNED_OUT };

  const id = int(form, "id");
  const updatedAt = String(form.get("updatedAt") ?? "");
  const intent = form.get("intent") === "publish" ? "publish" : "save";
  if (!id || !updatedAt) return stale;

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return stale;
  }

  const draft = spec.toDraft(parsed);
  const refused =
    intent === "publish"
      ? "Not published. Fix the marked fields first; your edits are still here."
      : "Not saved. Fix the marked fields first.";
  const errors: FieldErrors = intent === "publish" ? spec.publishErrors(draft) : spec.draftErrors(draft);
  if (Object.keys(errors).length > 0) {
    return { ...previous, status: "invalid", errors, message: refused };
  }

  // Null for a kind without pages: the row keeps its key.
  const slug = spec.addressed ? spec.slugOf(draft) : null;
  if (slug) {
    const claim = await slugClaim(ctx.sql, spec, id, slug);
    if (claim) {
      return { ...previous, status: "invalid", errors: { slug: slugTakenMessage(spec, slug, claim) }, message: refused };
    }
  }

  const payload = JSON.stringify(spec.toPayload(draft));

  let rows: Record<string, unknown>[];
  try {
    // `updated_at = ${updatedAt}` is the concurrency check: if anyone saved
    // since this form was loaded, nothing matches and nothing is written.
    rows =
      intent === "publish"
        ? await ctx.sql`
            with updated as (
              update content_entries
                 set draft = ${payload}::jsonb, published = ${payload}::jsonb,
                     slug = coalesce(${slug}, slug), published_at = now(), updated_at = now()
               where id = ${id} and kind = ${spec.kind} and deleted_at is null
                 and updated_at = ${updatedAt}::timestamptz
              returning id, updated_at
            ), rev as (
              insert into content_revisions (target, action, payload, actor)
              select 'entry:' || id, 'publish', ${payload}::jsonb, ${ctx.actor} from updated
            )
            select updated_at::text as updated_at from updated
          `
        : await ctx.sql`
            with updated as (
              update content_entries
                 set draft = ${payload}::jsonb, updated_at = now(),
                     -- A live entry keeps its live address in the column
                     -- until the new one is published.
                     slug = case when published is null then coalesce(${slug}, slug) else slug end
               where id = ${id} and kind = ${spec.kind} and deleted_at is null
                 and updated_at = ${updatedAt}::timestamptz
              returning id, updated_at
            ), rev as (
              insert into content_revisions (target, action, payload, actor)
              select 'entry:' || id, 'save', ${payload}::jsonb, ${ctx.actor} from updated
            )
            select updated_at::text as updated_at from updated
          `;
  } catch (error) {
    if (isUniqueViolation(error) && slug) {
      return {
        ...previous,
        status: "invalid",
        errors: { slug: `Another ${spec.one} already uses ${spec.publicPath(slug)}.` },
        message: refused,
      };
    }
    console.error("saveEntry: update failed", error);
    return { ...previous, status: "error", errors: {}, message: "That did not save. Your edits are still here; try again." };
  }

  if (rows.length === 0) {
    return {
      ...previous,
      status: "conflict",
      errors: {},
      message: `Someone saved this ${spec.one} after you opened it, or it was deleted. Copy anything you need, then reload to see their version.`,
    };
  }

  if (intent === "publish") updateTag(spec.tag);
  refresh();

  return {
    status: intent === "publish" ? "published" : "saved",
    errors: {},
    message: intent === "publish" ? "Published. The live site now shows this version." : "Draft saved. The live site is unchanged.",
    updatedAt: String(rows[0].updated_at),
  };
}

/* ---- Whole-entry actions ----

   Plain form actions: each runs, records itself, and refreshes the page. A
   caller without access is sent to sign in rather than told why, since a
   real studio user only gets here with an expired session. */

async function guarded(form: FormData) {
  const spec = specOf(form);
  const ctx = await access();
  if (!ctx) redirect("/auth/sign-in");
  return { ...ctx, spec, id: int(form, "id") };
}

/** Takes the entry off the site. The draft stays. */
export async function unpublishEntry(form: FormData) {
  const { sql, actor, spec, id } = await guarded(form);
  if (!spec || !id) return;
  await sql`
    with updated as (
      update content_entries
         set published = null, published_at = null, slug = coalesce(draft->>'slug', slug)
       where id = ${id} and kind = ${spec.kind} and published is not null
      returning id
    )
    insert into content_revisions (target, action, payload, actor)
    select 'entry:' || id, 'unpublish', null, ${actor} from updated
  `;
  updateTag(spec.tag);
  refresh();
}

/** Throws away unpublished edits: the draft becomes the live version again. */
export async function revertEntry(form: FormData) {
  const { sql, actor, spec, id } = await guarded(form);
  if (!spec || !id) return;
  await sql`
    with updated as (
      update content_entries
         set draft = published, updated_at = now()
       where id = ${id} and kind = ${spec.kind} and published is not null
      returning id, draft
    )
    insert into content_revisions (target, action, payload, actor)
    select 'entry:' || id, 'revert', draft, ${actor} from updated
  `;
  refresh();
}

/** Copies an earlier version from the history into the draft. Nothing goes
 *  live until it is published. */
export async function loadRevision(form: FormData) {
  const { sql, actor, spec, id } = await guarded(form);
  const revision = int(form, "revision");
  if (!spec || !id || !revision) return;

  // An old version may carry an address another entry has taken since. Say
  // so instead of loading half of it or failing silently.
  const source = await sql`
    select payload->>'slug' as slug from content_revisions
     where id = ${revision} and target = ${`entry:${id}`} and payload is not null
  `;
  if (source.length === 0) return;
  const slug = (source[0] as { slug?: string | null }).slug;
  if (spec.addressed && slug) {
    const claim = await slugClaim(sql, spec, id, slug);
    if (claim) {
      redirect(
        `${spec.studioPath}/${id}?notice=${claim === "deleted" ? "slug-deleted" : "slug-taken"}&slug=${encodeURIComponent(slug)}`,
      );
    }
  }

  await sql`
    with source as (
      select payload from content_revisions
       where id = ${revision} and target = ${`entry:${id}`} and payload is not null
    ), updated as (
      update content_entries
         set draft = (select payload from source), updated_at = now(),
             slug = case when published is null
                         then coalesce((select payload->>'slug' from source), slug)
                         else slug end
       where id = ${id} and kind = ${spec.kind} and exists (select 1 from source)
      returning id, draft
    )
    insert into content_revisions (target, action, payload, actor)
    select 'entry:' || id, 'revert', draft, ${actor} from updated
  `;
  refresh();
}

/** Soft delete: off the site and out of the list, restorable from the
 *  "Deleted" section. */
export async function deleteEntry(form: FormData) {
  const { sql, actor, spec, id } = await guarded(form);
  if (!spec || !id) return;
  await sql`
    with updated as (
      update content_entries set deleted_at = now()
       where id = ${id} and kind = ${spec.kind} and deleted_at is null
      returning id
    )
    insert into content_revisions (target, action, payload, actor)
    select 'entry:' || id, 'delete', null, ${actor} from updated
  `;
  updateTag(spec.tag);
  redirect(spec.studioPath);
}

/** Brings a deleted entry back at the end of the list, with whatever
 *  published state it had. */
export async function restoreEntry(form: FormData) {
  const { sql, actor, spec, id } = await guarded(form);
  if (!spec || !id) return;
  await sql`
    with updated as (
      update content_entries
         set deleted_at = null,
             sort_order = (select coalesce(max(sort_order), -1) + 1 from content_entries
                            where kind = ${spec.kind} and deleted_at is null)
       where id = ${id} and kind = ${spec.kind} and deleted_at is not null
      returning id
    )
    insert into content_revisions (target, action, payload, actor)
    select 'entry:' || id, 'restore', null, ${actor} from updated
  `;
  updateTag(spec.tag);
  refresh();
}

/** Moves an entry one place up or down. The whole list is renumbered 0..n so
 *  gaps and ties left by earlier edits do not accumulate. */
export async function moveEntry(form: FormData) {
  const { sql, spec, id } = await guarded(form);
  const step = form.get("direction") === "up" ? -1 : 1;
  if (!spec || !id) return;

  const rows = await sql`
    select id from content_entries
     where kind = ${spec.kind} and deleted_at is null
     order by sort_order, id
  `;
  const ids = (rows as { id: string | number }[]).map((row) => Number(row.id));
  const from = ids.indexOf(id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];

  await sql`
    update content_entries as c
       set sort_order = v.ord
      from unnest(${ids}::bigint[], ${ids.map((_, i) => i)}::int[]) as v(id, ord)
     where c.id = v.id and c.kind = ${spec.kind}
  `;
  updateTag(spec.tag);
  refresh();
}
