# Admin dashboard — build plan

Status: planned, not started. Written 2026-10-21.

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

| Decision | Choice |
|---|---|
| Content store | Postgres (Neon), already wired for inquiries |
| Accounts | **Single account.** No signup route; the first admin is seeded from the CLI |
| Versioning | **Draft vs published**, per entry, with a revision log and rollback |
| Hosting | **Vercel**, custom domain pointed at it |
| Auth mechanism | `node:crypto` scrypt + opaque session rows in Postgres — no auth library |
| Media | Deferred to Phase 5. On Vercel, Vercel Blob rather than Neon Object Storage: one env var, and `next/image` serves it off the same CDN |
| New runtime deps | `zod` only (form validation + parsing jsonb at the DB boundary). `@vercel/blob` at Phase 5 |

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

### Admin is a separate route group

`app/(admin)/admin/*` with its own layout: no `SiteHeader`/`SiteFooter`,
uncached, `robots: noindex`, excluded from the sitemap.

Guarding is two layers, per Next's own auth guidance:

1. `proxy.ts` (Next 16 — `middleware.ts` is deprecated) matching
   `/admin/:path*`, doing a cheap cookie-presence redirect to `/admin/login`.
2. `requireAdmin()` in a `lib/auth.ts` data-access layer, called by every
   admin page **and** every mutation action. This is the actual boundary; the
   proxy check is an optimistic redirect and nothing more.

### Admin look

Brand tokens from `app/globals.css`, no seventh colour. Space Grotesk
throughout, dense and utilitarian — it is a tool, not a brand surface.

Plain `<textarea>` fields, no rich-text editor. The voice discipline in
CLAUDE.md is better served by prose fields than a formatting toolbar, and it
avoids a heavy dependency and a sanitisation problem.

## Schema

`db/002_admin.sql`
- `admins` — email, password_hash, created_at
- `admin_sessions` — token_hash, admin_id, expires_at, created_at
- `login_attempts` — identifier, ip, created_at (throttling)
- `audit_log` — admin_id, action, target, created_at

`db/003_content.sql`
- `content_entries` — id, type (`category` | `project` | `event`), slug,
  sort_order, draft jsonb, published jsonb, published_at, updated_at,
  deleted_at; unique on (type, slug)
- `settings` — key text primary key, draft jsonb, published jsonb,
  published_at, updated_at. Holds `SITE`, `NAV`, the logo reference, the home
  hero copy and the section headings currently hardcoded in `app/page.tsx`
- `content_revisions` — append-only: entry ref, payload, action, admin_id,
  created_at

`db/004_inquiries_status.sql`
- adds `status` (`new` | `read` | `replied` | `archived`), `notes`, `read_at`
  to `inquiries`

Migrations stay re-runnable (`if not exists`, `add column if not exists`) —
`scripts/migrate.mjs` has no ledger.

## Security

- scrypt with a per-account salt; compare with `timingSafeEqual`
- session token: 32 random bytes, base64url; only its SHA-256 is stored.
  30-day expiry, sliding refresh, revoke-all on password change
- login throttle on both email and IP; lock out after N attempts
- cookies: `httpOnly`, `secure`, `sameSite: 'lax'`, `path: '/'`, host-only (no
  `domain`) so a preview deployment can't present a production cookie
- Server Actions carry Next's built-in origin check, so no separate CSRF token
- every mutation writes to `audit_log`
- enabling draft mode goes through `requireAdmin()` — the preview route is not
  a public bypass

## Vercel notes

- Node runtime (required by Cache Components); nothing may set `runtime = 'edge'`
- `revalidateTag` propagates across the fleet via Vercel's cache
- Env: `DATABASE_URL` per environment, `BLOB_READ_WRITE_TOKEN` from Phase 5.
  No session secret — sessions are opaque DB rows, not JWTs
- **Point preview deployments at a Neon branch**, not production. Otherwise an
  edit made from a preview URL publishes to the live site
- Draft mode's `__prerender_bypass` cookie is regenerated on every build, so a
  preview session ends at the next deploy. Expected, worth telling the client

## Phases

### 1 — Auth foundation
`db/002_admin.sql`, `lib/auth.ts` (hash, verify, session create/read/destroy,
`requireAdmin`), `/admin/login`, `proxy.ts`, logout, login throttling, and
`scripts/create-admin.mjs` to seed the one account from the CLI.

### 2 — Contacts inbox
Highest value, zero risk to the public site. `db/004_inquiries_status.sql`,
then `/admin` lands on the inbox: keyset-paginated newest-first list, filter by
kind and status, detail view, mark read/replied/archived, internal notes,
`mailto:` reply, CSV export, delete. Retires the README's "reading the inbox is
a `select *` for now" and the open TODO about nothing notifying the studio — an
unread count first, email only if wanted.

### 3 — Content read layer
`db/003_content.sql`; a seed script generated *from* the current
`lib/content.ts` so today's placeholder copy moves across verbatim; readers
with `use cache` + `cacheTag` + draft-mode branch; pages, metadata and sitemap
switched over; `cacheComponents: true`. Verify against the build output that
every public route still prerenders. No visible change to the site.

### 4 — Editors and publishing
The largest phase, roughly double what it would be without versioning. One
data-driven form component over per-type field metadata rather than a bespoke
page each: site settings, home copy, nav, categories and their objects,
projects and their sections, events. Save draft / Publish / Unpublish /
Revert, revision history with rollback, reorder via `sort_order`, soft delete
and restore. A `/admin/preview` route handler that enables draft mode behind
`requireAdmin()` plus an "exit preview" bar on the public site.

### 5 — Media
Vercel Blob, upload UI, **required** alt text (an on-page SEO deliverable),
`next/image` wiring, and `ImageSlot` falling back to the motif only where no
image is set.

### 6 — Hardening and launch
Rate limiting on the public inquiry form — the standing pre-launch blocker in
`app/contact/actions.ts`. Neon branch for previews. A backup/restore routine
for `content_entries` and `settings`: once content lives only in Postgres, the
repo is no longer the backup. Audit log surfaced in the UI. Accessibility pass,
mobile and tablet pass on the admin. README and docs updated. Domain, env and
deploy checklist.

## Open items

- Who holds the single account's credentials, and where are they stored
- Whether a new inquiry should send email (Resend or similar) or whether the
  unread badge is enough
- Whether the client wants to edit the six palette hex values from the admin.
  Recommend no: the palette is locked by the brand guide and belongs in
  `globals.css`
