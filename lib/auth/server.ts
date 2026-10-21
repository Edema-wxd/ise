import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Server-side Neon Auth (Managed Better Auth).
 *
 * Users and sessions live in the `neon_auth` schema on the same branch as the
 * rest of the data, so auth state branches with the database.
 *
 * `NEON_AUTH_BASE_URL` is written by `neon deploy` / `neon env pull`.
 * `NEON_AUTH_COOKIE_SECRET` is ours, not Neon's — see `.env.example`.
 *
 * This guards `/studio`, the studio's own view of the inquiries table. The
 * public site has no accounts and must not grow any.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
