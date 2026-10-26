-- Inquiries submitted through the custom-orders form.
--
-- Run with: npm run db:migrate

create table if not exists inquiries (
  id          bigint generated always as identity primary key,
  -- 'commission' is a request for a piece; 'general' is everything else.
  kind        text        not null check (kind in ('commission', 'general')),
  name        text        not null check (length(name) between 1 and 120),
  email       text        not null check (length(email) between 3 and 200),
  message     text        not null check (length(message) between 1 and 4000),
  created_at  timestamptz not null default now()
);

-- The studio reads this newest-first; nothing queries it any other way yet.
create index if not exists inquiries_created_at_idx
  on inquiries (created_at desc);
