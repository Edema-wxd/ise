import { getAuth } from "@/lib/auth/server";
import { getSql } from "@/lib/db";

export type StudioAccess =
  | { ok: true; email: string }
  | { ok: false; reason: "unconfigured" | "signed-out" | "not-allowed" };

/** Accounts allowed to edit, from `STUDIO_EMAILS`, lowercased. */
function allowlist(): Set<string> {
  return new Set(
    (process.env.STUDIO_EMAILS ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Who is asking, and whether they may edit.
 *
 * Called by every studio page and, separately, by every studio Server Action:
 * an action is a public POST endpoint whatever page it was rendered on, so the
 * page having checked proves nothing about the request in front of the action.
 *
 * Holding a Neon Auth account is not enough. Managed Auth creates an account
 * for anyone who posts to its sign-up endpoint, so access is the
 * `STUDIO_EMAILS` allowlist, matched against the email stored in
 * `neon_auth.user` — the same rule `functions/inquiries.ts` applies to the
 * inbox. It fails closed: no auth, no database or an empty list means nobody.
 */
export async function getStudioAccess(): Promise<StudioAccess> {
  const auth = getAuth();
  const sql = getSql();
  if (!auth || !sql) return { ok: false, reason: "unconfigured" };

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: "signed-out" };

  const rows = await sql`select email from neon_auth.user where id = ${userId}`;
  const email = (rows[0] as { email?: string } | undefined)?.email?.toLowerCase();
  if (!email || !allowlist().has(email)) return { ok: false, reason: "not-allowed" };

  return { ok: true, email };
}
