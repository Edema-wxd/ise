-- Spam control for the custom-orders form, and a record of what the studio
-- has already been told about.
--
-- Run with: npm run db:migrate

-- One row per submission that passed validation, used to answer "how many has
-- this caller sent in the last hour?". Pruned by the digest function.
create table if not exists inquiry_attempts (
  id         bigint      generated always as identity primary key,
  -- sha-256 of the caller's IP address with a server-side pepper. The address
  -- itself is never stored: the only question ever asked of this column is
  -- whether two submissions came from the same caller, and a hash answers it.
  caller     text        not null check (length(caller) = 64),
  created_at timestamptz not null default now()
);

-- The limiter counts one caller's recent rows; the prune sweeps by age.
create index if not exists inquiry_attempts_caller_idx
  on inquiry_attempts (caller, created_at desc);
create index if not exists inquiry_attempts_created_at_idx
  on inquiry_attempts (created_at);

-- Null means the studio has not been told about this inquiry yet. The digest
-- stamps it only after a destination accepts it, so a failed delivery is
-- retried on the next tick rather than lost.
alter table inquiries add column if not exists notified_at timestamptz;

-- Partial, because the digest only ever asks for the unnotified ones and that
-- set is empty almost all the time.
create index if not exists inquiries_unnotified_idx
  on inquiries (created_at)
  where notified_at is null;
