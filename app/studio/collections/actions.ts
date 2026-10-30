"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSql } from "@/lib/db";
import {
  draftErrors,
  publishErrors,
  slugify,
  toDraft,
  toPayload,
  type FieldErrors,
} from "@/lib/studio/collections";
import { getStudioAccess } from "@/lib/studio/session";
import type { EditorState, NewCollectionState } from "./state";

/*
  Every action here is a public POST endpoint, whatever page it was rendered
  on, so each one re-checks access itself before touching a row.

  Each write and its `content_revisions` row go in one statement (a CTE), so
  the history can never miss a change. The public cache is invalidated only
  when what visitors see changes: publish, unpublish, delete, restore and
  reorder. A saved draft is invisible to the site, so it invalidates nothing.
*/

const PUBLIC_TAG = "content:collection";

async function access() {
  const sql = getSql();
  const studio = await getStudioAccess();
  if (!sql || !studio.ok) return null;
  return { sql, actor: studio.email };
}

function int(form: FormData, field: string): number | null {
  const value = Number(form.get(field));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

/* ---- Create ---- */

export async function createCollection(
  _previous: NewCollectionState,
  form: FormData,
): Promise<NewCollectionState> {
  const ctx = await access();
  if (!ctx) return { error: "You are signed out, or this account is not on the studio list." };

  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Give the new collection a name." };
  const slug = slugify(name);
  if (!slug) return { error: "Use at least one letter or number in the name." };

  const draft = JSON.stringify(toPayload({ ...toDraft({ name, slug }), pieces: [] }));

  let id: number;
  try {
    // New collections go to the end of the list, unpublished.
    const rows = await ctx.sql`
      with created as (
        insert into content_entries (kind, slug, sort_order, draft)
        values (
          'collection', ${slug},
          (select coalesce(max(sort_order), -1) + 1 from content_entries where kind = 'collection'),
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
      return { error: `There is already a collection at /collections/${slug}. Pick another name.` };
    }
    console.error("createCollection: insert failed", error);
    return { error: "That did not save. Try again." };
  }

  redirect(`/studio/collections/${id}`);
}

/* ---- Save and publish ---- */

export async function saveCollection(previous: EditorState, form: FormData): Promise<EditorState> {
  const ctx = await access();
  if (!ctx) {
    return { ...previous, status: "error", errors: {}, message: "You are signed out, or this account is not on the studio list." };
  }

  const id = int(form, "id");
  const updatedAt = String(form.get("updatedAt") ?? "");
  const intent = form.get("intent") === "publish" ? "publish" : "save";
  if (!id || !updatedAt) return { ...previous, status: "error", errors: {}, message: "That form is out of date. Reload the page." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return { ...previous, status: "error", errors: {}, message: "That form is out of date. Reload the page." };
  }

  const draft = toDraft(parsed);
  const errors: FieldErrors = intent === "publish" ? publishErrors(draft) : draftErrors(draft);
  if (Object.keys(errors).length > 0) {
    return {
      ...previous,
      status: "invalid",
      errors,
      message:
        intent === "publish"
          ? "Not published. Fix the marked fields first; your edits are still here."
          : "Not saved. Fix the marked fields first.",
    };
  }

  const payload = JSON.stringify(toPayload(draft));

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
                     slug = ${draft.slug}, published_at = now(), updated_at = now()
               where id = ${id} and kind = 'collection' and deleted_at is null
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
                 set draft = ${payload}::jsonb, slug = ${draft.slug}, updated_at = now()
               where id = ${id} and kind = 'collection' and deleted_at is null
                 and updated_at = ${updatedAt}::timestamptz
              returning id, updated_at
            ), rev as (
              insert into content_revisions (target, action, payload, actor)
              select 'entry:' || id, 'save', ${payload}::jsonb, ${ctx.actor} from updated
            )
            select updated_at::text as updated_at from updated
          `;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ...previous,
        status: "invalid",
        errors: { slug: "Another collection already uses this web address." },
        message: "Not saved. Fix the marked fields first.",
      };
    }
    console.error("saveCollection: update failed", error);
    return { ...previous, status: "error", errors: {}, message: "That did not save. Your edits are still here; try again." };
  }

  if (rows.length === 0) {
    return {
      ...previous,
      status: "conflict",
      errors: {},
      message:
        "Someone saved this collection after you opened it, or it was deleted. Copy anything you need, then reload to see their version.",
    };
  }

  if (intent === "publish") updateTag(PUBLIC_TAG);
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

async function guarded() {
  const ctx = await access();
  if (!ctx) redirect("/auth/sign-in");
  return ctx;
}

/** Takes the collection off the site. The draft stays. */
export async function unpublishCollection(form: FormData) {
  const { sql, actor } = await guarded();
  const id = int(form, "id");
  if (!id) return;
  await sql`
    with updated as (
      update content_entries
         set published = null, published_at = null, updated_at = now()
       where id = ${id} and kind = 'collection' and published is not null
      returning id
    )
    insert into content_revisions (target, action, payload, actor)
    select 'entry:' || id, 'unpublish', null, ${actor} from updated
  `;
  updateTag(PUBLIC_TAG);
  refresh();
}

/** Throws away unpublished edits: the draft becomes the live version again. */
export async function revertCollection(form: FormData) {
  const { sql, actor } = await guarded();
  const id = int(form, "id");
  if (!id) return;
  await sql`
    with updated as (
      update content_entries
         set draft = published, slug = published->>'slug', updated_at = now()
       where id = ${id} and kind = 'collection' and published is not null
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
  const { sql, actor } = await guarded();
  const id = int(form, "id");
  const revision = int(form, "revision");
  if (!id || !revision) return;
  try {
    await sql`
      with source as (
        select payload from content_revisions
         where id = ${revision} and target = ${`entry:${id}`} and payload is not null
      ), updated as (
        update content_entries
           set draft = (select payload from source),
               slug = (select payload->>'slug' from source),
               updated_at = now()
         where id = ${id} and kind = 'collection' and exists (select 1 from source)
        returning id, draft
      )
      insert into content_revisions (target, action, payload, actor)
      select 'entry:' || id, 'revert', draft, ${actor} from updated
    `;
  } catch (error) {
    // The old version's slug is now taken by another collection.
    if (!isUniqueViolation(error)) throw error;
  }
  refresh();
}

/** Soft delete: off the site and out of the list, restorable from the
 *  "Deleted" section. */
export async function deleteCollection(form: FormData) {
  const { sql, actor } = await guarded();
  const id = int(form, "id");
  if (!id) return;
  await sql`
    with updated as (
      update content_entries set deleted_at = now(), updated_at = now()
       where id = ${id} and kind = 'collection' and deleted_at is null
      returning id
    )
    insert into content_revisions (target, action, payload, actor)
    select 'entry:' || id, 'delete', null, ${actor} from updated
  `;
  updateTag(PUBLIC_TAG);
  redirect("/studio/collections");
}

/** Brings a deleted collection back at the end of the list, with whatever
 *  published state it had. */
export async function restoreCollection(form: FormData) {
  const { sql, actor } = await guarded();
  const id = int(form, "id");
  if (!id) return;
  await sql`
    with updated as (
      update content_entries
         set deleted_at = null, updated_at = now(),
             sort_order = (select coalesce(max(sort_order), -1) + 1 from content_entries
                            where kind = 'collection' and deleted_at is null)
       where id = ${id} and kind = 'collection' and deleted_at is not null
      returning id
    )
    insert into content_revisions (target, action, payload, actor)
    select 'entry:' || id, 'restore', null, ${actor} from updated
  `;
  updateTag(PUBLIC_TAG);
  refresh();
}

/** Moves a collection one place up or down. The whole list is renumbered
 *  0..n so gaps and ties left by earlier edits do not accumulate. */
export async function moveCollection(form: FormData) {
  const { sql } = await guarded();
  const id = int(form, "id");
  const step = form.get("direction") === "up" ? -1 : 1;
  if (!id) return;

  const rows = await sql`
    select id from content_entries
     where kind = 'collection' and deleted_at is null
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
     where c.id = v.id and c.kind = 'collection'
  `;
  updateTag(PUBLIC_TAG);
  refresh();
}
