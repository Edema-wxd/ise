"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { SIGNED_OUT, studioContext } from "@/lib/studio/access";
import { isSettingKey, SETTINGS, type SettingSpec } from "@/lib/studio/settings";
import type { FieldErrors } from "@/lib/studio/kinds";
import type { EditorState } from "../state";

/*
  Writes for site-wide settings: one `settings` row per key, with the same
  rules as content entries (see app/studio/actions.ts). Each write and its
  `content_revisions` row (target `settings:<key>`) are one statement;
  `updated_at` is the draft's version and every save must match it.

  A setting the site has never had a row for is created on its first save,
  under `on conflict do nothing`, so two first saves cannot both win.

  There is no unpublish or delete: a setting with nothing published only
  makes the site fall back to its shipped defaults, which is never what an
  editor means.
*/

function specOf(form: FormData): SettingSpec<any> | null {
  const key = form.get("key");
  return isSettingKey(key) ? SETTINGS[key] : null;
}

export async function saveSetting(previous: EditorState, form: FormData): Promise<EditorState> {
  const stale = { ...previous, status: "error" as const, errors: {}, message: "That form is out of date. Reload the page." };
  const spec = specOf(form);
  if (!spec) return stale;
  const ctx = await studioContext();
  if (!ctx) return { ...previous, status: "error", errors: {}, message: SIGNED_OUT };

  const updatedAt = String(form.get("updatedAt") ?? "");
  const publish = form.get("intent") === "publish";
  if (!updatedAt) return stale;

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return stale;
  }

  const draft = spec.toDraft(parsed);
  const errors: FieldErrors = publish ? spec.publishErrors(draft) : spec.draftErrors(draft);
  if (Object.keys(errors).length > 0) {
    return {
      ...previous,
      status: "invalid",
      errors,
      message: publish
        ? "Not published. Fix the marked fields first; your edits are still here."
        : "Not saved. Fix the marked fields first.",
    };
  }

  const payload = JSON.stringify(spec.toPayload(draft));
  const action = publish ? "publish" : "save";

  let rows: Record<string, unknown>[];
  try {
    rows =
      updatedAt === "new"
        ? await ctx.sql`
            with created as (
              insert into settings (key, draft, published, published_at, updated_at)
              values (
                ${spec.key}, ${payload}::jsonb,
                case when ${publish}::boolean then ${payload}::jsonb end,
                case when ${publish}::boolean then now() end,
                now()
              )
              on conflict (key) do nothing
              returning key, updated_at
            ), rev as (
              insert into content_revisions (target, action, payload, actor)
              select 'settings:' || key, ${action}, ${payload}::jsonb, ${ctx.actor} from created
            )
            select updated_at::text as updated_at from created
          `
        : publish
          ? await ctx.sql`
              with updated as (
                update settings
                   set draft = ${payload}::jsonb, published = ${payload}::jsonb,
                       published_at = now(), updated_at = now()
                 where key = ${spec.key} and updated_at = ${updatedAt}::timestamptz
                returning key, updated_at
              ), rev as (
                insert into content_revisions (target, action, payload, actor)
                select 'settings:' || key, 'publish', ${payload}::jsonb, ${ctx.actor} from updated
              )
              select updated_at::text as updated_at from updated
            `
          : await ctx.sql`
              with updated as (
                update settings
                   set draft = ${payload}::jsonb, updated_at = now()
                 where key = ${spec.key} and updated_at = ${updatedAt}::timestamptz
                returning key, updated_at
              ), rev as (
                insert into content_revisions (target, action, payload, actor)
                select 'settings:' || key, 'save', ${payload}::jsonb, ${ctx.actor} from updated
              )
              select updated_at::text as updated_at from updated
            `;
  } catch (error) {
    console.error("saveSetting: write failed", error);
    return { ...previous, status: "error", errors: {}, message: "That did not save. Your edits are still here; try again." };
  }

  if (rows.length === 0) {
    return {
      ...previous,
      status: "conflict",
      errors: {},
      message: "Someone saved these settings after you opened them. Copy anything you need, then reload to see their version.",
    };
  }

  if (publish) updateTag(spec.tag);
  refresh();

  return {
    status: publish ? "published" : "saved",
    errors: {},
    message: publish ? "Published. The live site now shows this version." : "Draft saved. The live site is unchanged.",
    updatedAt: String(rows[0].updated_at),
  };
}

async function guarded(form: FormData) {
  const ctx = await studioContext();
  if (!ctx) redirect("/auth/sign-in");
  return { ...ctx, spec: specOf(form) };
}

/** Throws away unpublished edits: the draft becomes the live version again. */
export async function revertSetting(form: FormData) {
  const { sql, actor, spec } = await guarded(form);
  if (!spec) return;
  await sql`
    with updated as (
      update settings set draft = published, updated_at = now()
       where key = ${spec.key} and published is not null
      returning key, draft
    )
    insert into content_revisions (target, action, payload, actor)
    select 'settings:' || key, 'revert', draft, ${actor} from updated
  `;
  refresh();
}

/** Copies an earlier version from the history into the draft. Nothing goes
 *  live until it is published. */
export async function loadSettingRevision(form: FormData) {
  const { sql, actor, spec } = await guarded(form);
  const revision = Number(form.get("revision"));
  if (!spec || !Number.isSafeInteger(revision) || revision <= 0) return;
  await sql`
    with source as (
      select payload from content_revisions
       where id = ${revision} and target = ${`settings:${spec.key}`} and payload is not null
    ), updated as (
      update settings set draft = (select payload from source), updated_at = now()
       where key = ${spec.key} and exists (select 1 from source)
      returning key, draft
    )
    insert into content_revisions (target, action, payload, actor)
    select 'settings:' || key, 'revert', draft, ${actor} from updated
  `;
  refresh();
}
