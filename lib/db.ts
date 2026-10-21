import { neon } from "@neondatabase/serverless";

/**
 * Returns a Neon client, or null when `DATABASE_URL` is not set.
 *
 * Null rather than a throw: the site is a portfolio that must keep serving
 * even if the database is unreachable or unconfigured, and the one caller
 * degrades to telling the visitor to email the studio directly.
 *
 * The connection string belongs in `.env.local` (gitignored) locally, and in
 * the host's environment in production. See `.env.example`.
 */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}
