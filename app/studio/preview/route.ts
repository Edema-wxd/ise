import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { previewPath } from "@/lib/preview";
import { getStudioAccess } from "@/lib/studio/session";

/**
 * Turns on draft mode and opens a page of the site, so the studio sees its
 * drafts as the site would show them.
 *
 * Behind the same check as every studio page: draft mode is a cache bypass,
 * and the readers in lib/content.ts serve drafts while it is on, so the
 * route that enables it is not a public one. `proxy.ts` sends a signed-out
 * visitor to sign in first; this re-checks the session and the allowlist,
 * because the proxy's check is only a redirect.
 *
 * GET, because the studio opens it as a link in a new tab. All it changes is
 * what this one browser is shown.
 */
export async function GET(request: Request) {
  // Per request, always: a prerendered answer would be one person's redirect
  // served to everyone.
  await connection();
  const studio = await getStudioAccess();
  if (!studio.ok) redirect(studio.reason === "not-allowed" ? "/studio" : "/auth/sign-in");

  const path = previewPath(new URL(request.url).searchParams.get("path")) ?? "/";
  (await draftMode()).enable();
  redirect(path);
}
