import { getSql } from "@/lib/db";
import { getStudioAccess } from "@/lib/studio/session";

/**
 * The database and the acting account, or null when the caller may not
 * edit. Every studio Server Action starts here: an action is a public POST
 * endpoint whatever page rendered it, so the page having checked proves
 * nothing about the request in front of the action.
 */
export async function studioContext() {
  const sql = getSql();
  const studio = await getStudioAccess();
  if (!sql || !studio.ok) return null;
  return { sql, actor: studio.email };
}

export const SIGNED_OUT = "You are signed out, or this account is not on the studio list.";

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}
