import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

let instance: NeonAuth | null | undefined;

/**
 * Server-side Neon Auth (Managed Better Auth), or null when it is not
 * configured.
 *
 * Users and sessions live in the `neon_auth` schema on the same branch as the
 * rest of the data, so auth state branches with the database.
 *
 * `NEON_AUTH_BASE_URL` is written by `neon deploy` / `neon env pull`.
 * `NEON_AUTH_COOKIE_SECRET` is ours, not Neon's — see `.env.example`.
 *
 * Created on first use rather than at import: `createNeonAuth` throws without
 * its config, and an import-time throw fails the whole build, public portfolio
 * included. Unconfigured, only /studio is affected, and it says so.
 *
 * This guards `/studio`, the studio's own view of the inquiries table. The
 * public site has no accounts and must not grow any.
 */
export function getAuth(): NeonAuth | null {
  if (instance === undefined) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;
    instance = baseUrl && secret ? createNeonAuth({ baseUrl, cookies: { secret } }) : null;
  }
  return instance;
}
