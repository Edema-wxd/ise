# Admin dashboard — build plan

Status: Phases 1–3 built. Written 2026-10-21, revised 2026-10-22 after the
stack changed under it (see Decisions).

An authenticated admin at `/admin` that (a) edits every piece of copy and data
on the public site, with a draft/published split, and (b) reads and works the
custom-order inbox.

## Scope note

CLAUDE.md lists "CMS backend, unless separately agreed" as out of scope. This
is that separate agreement, and it changes two things in the SOW: the site now
requires a Node host with secrets and a production database (no static export),
and content stops living in the repo. Write it into the client record before
Phase 3 lands.

Still out of scope, unchanged: cart, checkout, Shopify, inventory, ad pixels.

## Decisions (locked)

Revised 2026-10-22. The auth, inbox and media decisions below are **not** the
ones first written here: a parallel session built the auth layer and the inbox
on Neon's own primitives before this plan was executed, and that work was
adopted rather than replaced. What it changed is marked.

| Decision | Choice |
|---|---|
| Content store | Postgres (Neon) |
| Accounts | Single account. No signup route. Enforced by the `STUDIO_EMAILS` allowlist: an account that is not listed can sign in and is still refused |
| Versioning | Draft vs published, per entry, with a revision log and rollback |
| Auth mechanism | **Changed.** Neon Auth (Managed Better Auth) in [lib/auth/server.ts](../lib/auth/server.ts), not hand-rolled scrypt sessions. Users and sessions live in the `neon_auth` schema and branch with the database |
| Admin location | **Changed.** `/studio`, with sign-in at `/auth/sign-in`. Not `/admin` |
| Inbox read path | **Changed.** A Neon Function ([functions/inquiries.ts](../functions/inquiries.ts)), not direct SQL from the app |
| Media | **Changed.** UploadThing, already wired and closed by default, not Vercel Blob |
| Hosting | **Open.** Vercel was chosen for the app, but the inbox Function and auth deploy through `neon deploy`. Two pipelines for one feature; worth settling before launch |
| Content naming | **Changed.** `products` is now `collections` throughout |
| New runtime deps | None added by this plan. `zod` was planned and not needed: the jsonb boundary is checked by hand-written guards in [lib/content.ts](../lib/content.ts) |

## Architecture

### Content is documents, not normalized tables

Each editable thing is one row holding a JSON payload shaped exactly like the
types already exported from `lib/content.ts`. Child collections (a category's
objects, a project's sections) stay nested arrays inside that payload.

This is a deliberate change from a normalized schema. Once draft/published is
in play, normalization is a liability: publishing a category would mean
diffing child rows and reconciling their order. As one document it is a column
copy. Nothing on the site queries across objects or sections, so the
relational power buys nothing.

### Draft and published are two columns

- `draft` — what the editor is working on. Always present.
- `published` — what the public site serves. `null` means never published.
- Publish = copy `draft` into `published`, stamp `published_at`.
- Unpublish = `published = null`, draft untouched.
- Revert = copy `published` back over `draft`.
- Delete is soft (`deleted_at`), so a misclick is recoverable.

Every write also appends to `content_revisions`, which gives history and
rollback for free.

### Reading stays static

`lib/content.ts` stops exporting constants and starts exporting async readers
(`getCategories()`, `getProjects()`, `getEvents()`, `getSettings()`) returning
the *same* exported types. Pages change from `CATEGORIES.map(...)` to
`(await getCategories()).map(...)` and nothing else moves.

Turn on `cacheComponents: true` in `next.config.mjs`. Each reader is a
`'use cache'` scope with a `cacheTag`, so public pages still prerender:

```ts
export async function getCategories(): Promise<Category[]> {
  'use cache'
  cacheTag('content:category')
  const { isEnabled } = await draftMode()
  // isEnabled is the one runtime API readable inside a cache scope; cookies()
  // and headers() are not. Draft mode also forces this scope to re-execute
  // per request and skips writing to the cache, which is what preview needs.
  ...
}
```

Admin mutations call `revalidateTag('content:category')` for the tags they
touched. Edits go live in seconds with no redeploy.

Two knock-on changes: `app/sitemap.ts` reads published entries from the
database instead of the constants, and `generateStaticParams` in the two
dynamic routes either does the same or is dropped in favour of on-demand
rendering (`dynamicParams` defaults to true, so an unknown slug renders rather
than 404s). Dropping it is simpler and costs one cold render per new slug.

### The admin is at /studio, inside the site's layout

`/studio` is a normal route under the root layout, so it carries the public
header and footer. That was the parallel session's choice and it is left
alone; a separate chrome-free route group is a Phase 6 tidy-up, not a
correctness problem.

Guarding is two layers, which the existing code already gets right:

1. [proxy.ts](../proxy.ts) (Next 16 — `middleware.ts` is deprecated) matching
   `/studio/:path*`, doing the optimistic cookie redirect to `/auth/sign-in`.
2. The session read again inside the page before it reads a row. This is the
   actual boundary; the proxy check is a redirect and nothing more.

Every mutation added in Phase 4 re-reads the session the same way, in the
action, not in a layout.

Because the whole page blocks on `cookies()`, `/studio` carries
`export const instant = false` — there is no useful static shell for a page
that cannot render before it knows who is asking.

Neon Auth is optional at build time: `getAuth()` in
[lib/auth/server.ts](../lib/auth/server.ts) returns null when
`NEON_AUTH_BASE_URL` or `NEON_AUTH_COOKIE_SECRET` is unset. The proxy and
`/studio` then redirect to `/auth/sign-in`, which says sign-in is not set up,
and the public site still builds and serves. Every Phase 4 action must treat a
null `getAuth()` as "refuse", the same way.

### Admin look

Brand tokens from `app/globals.css`, no seventh colour. Space Grotesk
throughout, dense and utilitarian — it is a tool, not a brand surface.

Plain `<textarea>` fields, no rich-text editor. The voice discipline in
CLAUDE.md is better served by prose fields than a formatting toolbar, and it
avoids a heavy dependency and a sanitisation problem.

## Schema

Shipped in [db/002_content.sql](../db/002_content.sql):

- `content_entries` — id, kind (`collection` | `project` | `event`), slug,
  sort_order, `draft` jsonb, `published` jsonb, published_at, updated_at,
  deleted_at. Unique on (kind, slug).
- `settings` — key primary key, `draft`, `published`, published_at,
  updated_at. Four keys seeded: `site`, `nav`, `logo`, `copy`. `copy` holds
  the home hero and section headings, the footer prompt, and each index
  page's intro — all of which used to be written into JSX.
- `content_revisions` — append-only: target (`entry:<id>` / `settings:<key>`),
  action, payload, actor (email from the session, as text), created_at.

Not built, and no longer planned: `admins`, `admin_sessions`,
`login_attempts`. Neon Auth owns users and sessions in the `neon_auth` schema.
An `audit_log` table is also unnecessary — `content_revisions` records who
changed what, which is what it was for.

## Security

Handled by the adopted layer:

- Neon Auth owns password hashing, sessions and the cookie. `NEON_AUTH_COOKIE_SECRET` is ours and must be 32+ characters.
- `STUDIO_EMAILS` is the single-account allowlist; `STUDIO_ORIGINS` is the Function's CORS list, and needs the deployed origin before launch.
- Server Actions carry Next's built-in origin check, so no separate CSRF token.
- The UploadThing route is closed unless `UPLOADTHING_UPLOAD_SECRET` is set.

Still ours to do:

- Every Phase 4 mutation re-reads the session and writes a `content_revisions` row with the actor.
- Enabling draft mode must sit behind the same session check — the preview route is not a public bypass.
- Rate limiting on the public inquiry form (Phase 6). Still the standing pre-launch blocker.

## Hosting notes

- Node runtime throughout. Cache Components requires it; nothing may set `runtime = 'edge'`.
- `revalidateTag` must propagate across instances. It does on Vercel; confirm it for whatever serves the app if that changes.
- Env: `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (writes and migrations), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `NEON_FUNCTION_INQUIRIES_BASE_URL`, `STUDIO_EMAILS`, `STUDIO_ORIGINS`, and the UploadThing variables. Most are written by `neon env pull`.
- **Point previews at a Neon branch**, not production. Otherwise an edit made from a preview URL publishes to the live site. Auth state branches with the database, so this also keeps preview sessions separate.
- Draft mode's `__prerender_bypass` cookie is regenerated on every build, so a preview session ends at the next deploy. Expected; worth telling the client.
- Two deploy targets right now (the Next app, and `neon deploy` for the Function and auth). Settle this before launch.

## Phases

### 1 — Auth foundation — **done, by another route**
Neon Auth, `/auth/sign-in`, the `proxy.ts` guard on `/studio`, and the
`STUDIO_EMAILS` allowlist. The planned scrypt-and-session-rows build was
dropped as duplicate work.

### 2 — Contacts inbox — **done, by another route**
[app/studio/page.tsx](../app/studio/page.tsx) and
[app/studio/inbox.tsx](../app/studio/inbox.tsx), reading through
[functions/inquiries.ts](../functions/inquiries.ts).

Not yet built, and still wanted: filter by kind, status
(`new`/`read`/`replied`/`archived`), internal notes, CSV export, delete, and
an unread count. Those need the `db/004_inquiries_status.sql` columns from the
original plan. Folded into Phase 4b.

### 3 — Content read layer — **done**
- [db/002_content.sql](../db/002_content.sql) — the three tables.
- [lib/content-seed.ts](../lib/content-seed.ts) — today's copy, verbatim, plus
  the page copy lifted out of the JSX of six components.
- [lib/content.ts](../lib/content.ts) — types, cached readers, and
  hand-written guards for the jsonb boundary. A malformed entry is dropped and
  logged rather than rendered half-built.
- [scripts/seed-content.mjs](../scripts/seed-content.mjs) — insert-only, so it
  can never overwrite a studio edit. `npm run db:seed`.
- `cacheComponents: true`, and every consumer switched over: the root layout,
  header (now takes nav, logo and name as props, being a client component),
  footer, 404, home, both index pages, both detail pages, the contact page and
  action, and the sitemap.

Verified: `next build` exits 0, the public pages still prerender, and a value
changed directly in Postgres appears in the prerendered HTML — so the pages
read the database, not the seed.

### 4 — Editors and publishing — **collections done**
Built for collections, at [/studio/collections](../app/studio/collections/page.tsx):
list with create, reorder (renumbers `sort_order`), soft delete and restore;
an editor for the collection and its pieces and photo lists; Save draft /
Publish / Unpublish / Discard (revert) / load any revision into the draft.
Each write and its `content_revisions` row are one CTE statement; each save
carries the row's `updated_at` and is refused if it changed (no lost edits).
Access is `getStudioAccess()` in
[lib/studio/session.ts](../lib/studio/session.ts) — session plus the
`STUDIO_EMAILS` allowlist against `neon_auth.user` — re-checked in every
action. Publish runs `parseCollection()`, the public reader's own check.
Public-facing writes call `updateTag("content:collection")`.

Not yet: the same for projects, events, settings, nav and copy (the editor
is specific to collections; the field-metadata generalisation below is still
the plan once a second type needs it), preview/draft mode, revisions for
reorder, and `cacheLife` on the readers.

The largest phase. One data-driven form over per-type field metadata rather
than a bespoke page each: site settings, nav, page copy, collections and their
pieces, projects and their sections, events. Save draft / Publish / Unpublish
/ Revert, revision history with rollback, reorder via `sort_order`, soft
delete and restore. Every mutation re-reads the session, writes a
`content_revisions` row, and calls `revalidateTag` for the tags it touched.
A preview route that enables draft mode behind the session check, plus an
"exit preview" bar.

Set `cacheLife` on the content readers in this phase. They currently take the
default profile (15m revalidate); once publishing invalidates by tag, a long
life is the better fit.

### 4b — The rest of the text, and the inbox columns
Copy still written into components: the contact page's aside and commission
steps, the collection page's "Want one of these?" block, the 404 copy, and
the per-page meta descriptions. Plus the inbox status columns from Phase 2.

### 5 — Media
UploadThing is already wired and closed by default. This phase opens it behind
the studio session, adds the uploader and **required** alt text (an on-page
SEO deliverable), and fills the `image` field that every piece, collection,
project and event already carries.

### 6 — Hardening and launch
Rate limiting on the public inquiry form — the standing pre-launch blocker.
Neon branch for previews. Backup and restore for `content_entries` and
`settings`: once content lives only in Postgres, the repo is no longer the
backup. Settle the two-deploy-target question. Accessibility and mobile passes
on the studio. Decide whether `/studio` moves to a chrome-free route group.
Silence or explain the `HANGING_PROMISE_REJECTION` log noise `/studio` emits
during prerender validation (non-fatal; the build exits 0).

## Open items

- Which accounts go on `STUDIO_EMAILS`, and who holds their credentials
- Whether a new inquiry should send email (Resend or similar) or whether the
  unread badge is enough
- Whether the client wants to edit the six palette hex values from the admin.
  Recommend no: the palette is locked by the brand guide and belongs in
  `globals.css`
