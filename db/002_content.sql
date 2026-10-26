-- Editable site content, with a draft/published split.
--
-- Run with: npm run db:migrate
--
-- Content is stored as one JSON document per entry rather than normalised
-- tables. Publishing is then a column copy, and a collection's pieces or a
-- project's sections travel with their parent instead of needing their own
-- rows, their own order and their own reconciliation at publish time. Nothing
-- on the site queries across pieces or sections, so normalising would buy
-- nothing and cost the publish step.

create table if not exists content_entries (
  id           bigint      generated always as identity primary key,
  kind         text        not null check (kind in ('collection', 'project', 'event')),
  -- Stable key for the entry. Mirrors the slug inside the payload for
  -- collections and projects; derived from the title for events, which have
  -- no slug of their own.
  slug         text        not null check (length(slug) between 1 and 120),
  sort_order   int         not null default 0,
  -- What the studio is working on. Always present.
  draft        jsonb       not null,
  -- What the public site serves. Null means never published.
  published    jsonb,
  published_at timestamptz,
  updated_at   timestamptz not null default now(),
  -- Delete is soft, so a misclick in the editor is recoverable.
  deleted_at   timestamptz
);

create unique index if not exists content_entries_kind_slug_idx
  on content_entries (kind, slug);

-- Every public read is "one kind, in display order".
create index if not exists content_entries_kind_order_idx
  on content_entries (kind, sort_order, id);

-- Site-wide values that are not a list: the SITE block, the nav, the logo
-- reference, and the home page's own copy. Same draft/published split.
create table if not exists settings (
  key          text        primary key,
  draft        jsonb       not null,
  published    jsonb,
  published_at timestamptz,
  updated_at   timestamptz not null default now()
);

-- Append-only history, for "what changed" and for rollback.
create table if not exists content_revisions (
  id         bigint      generated always as identity primary key,
  -- 'entry:<id>' or 'settings:<key>'.
  target     text        not null,
  action     text        not null check (
    action in ('save', 'publish', 'unpublish', 'revert', 'delete', 'restore')
  ),
  -- The payload as it stood after the action, so a revision can be replayed.
  payload    jsonb,
  -- Email from the Neon Auth session. Text, not a foreign key: auth users
  -- live in the neon_auth schema and an account can go away while its history
  -- stays worth keeping.
  actor      text,
  created_at timestamptz not null default now()
);

create index if not exists content_revisions_target_idx
  on content_revisions (target, created_at desc);
