/**
 * A path on this site that preview may send someone to, or null.
 *
 * Preview redirects to a path it was handed, so this is what keeps it from
 * being an open redirect: a same-origin path only, never `//host` or a full
 * URL, and never back into the studio or the auth pages, which have no
 * draft to show.
 */
export function previewPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  let url: URL;
  try {
    url = new URL(raw, "https://preview.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://preview.invalid") return null;
  if (/^\/(studio|auth|api)(\/|$)/.test(url.pathname)) return null;
  return url.pathname + url.search + url.hash;
}

/** The studio's link that turns preview on and opens `path`. */
export function previewHref(path: string): string {
  return `/studio/preview?path=${encodeURIComponent(path)}`;
}
