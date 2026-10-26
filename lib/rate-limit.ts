import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { getSql } from "@/lib/db";

/*
  Caps on the custom-orders form.

  Per caller stops one script; the global cap stops a distributed one from
  filling the table overnight. Both are deliberately loose — a real commission
  enquiry is one submission, and someone sending a second after a typo should
  never meet a limit.
*/
const WINDOW = "1 hour";
const PER_CALLER = 5;
const GLOBAL = 60;

/**
 * Identifies the caller as a hash, never as an address.
 *
 * The forwarded headers are set by whatever proxy sits in front of the app and
 * can be spoofed by anyone talking to it directly, so this is a speed bump on
 * casual spam, not an access control. The global cap is what holds when the
 * per-caller value is being forged.
 */
async function caller() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || h.get("x-real-ip") || "unknown";

  /* Peppered because the IPv4 space is small enough to walk: an unpeppered
     hash of an address is the address. Missing pepper still limits — the
     column is just reversible, which is worth a warning, not a refusal. */
  const pepper = process.env.INQUIRY_HASH_PEPPER;
  if (!pepper) {
    console.warn("INQUIRY_HASH_PEPPER is not set; inquiry_attempts.caller is reversible");
  }
  return createHash("sha256").update(`${pepper ?? ""}:${address}`).digest("hex");
}

/**
 * Records one submission against the caller's hourly allowance.
 *
 * Returns false when the caller or the site as a whole is over its cap. The
 * row is written only when the submission is allowed, so a caller that keeps
 * hammering cannot grow the table past its own limit.
 *
 * Call this after validation and before the insert: a submission the form
 * already rejected has not cost anybody anything and should not count.
 */
export async function allowInquiry(sql: NonNullable<ReturnType<typeof getSql>>) {
  const key = await caller();

  // The window is bound as a value and cast, not interpolated: a parameter
  // inside a quoted `interval '...'` literal is not a parameter.
  const rows = await sql`
    select
      count(*) filter (where caller = ${key})::int as mine,
      count(*)::int                                as total
    from inquiry_attempts
    where created_at > now() - ${WINDOW}::interval
  `;
  const counts = rows[0] as { mine: number; total: number };

  if (counts.mine >= PER_CALLER || counts.total >= GLOBAL) return false;

  await sql`insert into inquiry_attempts (caller) values (${key})`;
  return true;
}
