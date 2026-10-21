/**
 * Neon Function: the studio's inquiries feed.
 *
 * It runs in the same region as the branch's Postgres, so reading the table is
 * a local hop rather than a round trip from wherever the site is hosted, and it
 * branches with the database — a preview branch reads that branch's rows.
 *
 * The browser calls this directly from /studio with a Managed Auth bearer
 * token. A Neon Function has a public HTTPS URL, so nothing stands in front of
 * it: every request is verified here before a row is read.
 */
import { attachDatabasePool } from "@neon/functions";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { Pool } from "pg";

/*
  Module scope, not per request: an isolate is reused across many requests, so
  the pool is opened once on cold start. `max` stays small because every live
  isolate keeps its own pool. `attachDatabasePool` absorbs idle disconnects,
  which node-postgres would otherwise raise as an uncaughtException and take
  the isolate down with it.
*/
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);

// Injected by Neon on any branch with Auth enabled.
const jwks = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!));
const issuer = new URL(process.env.NEON_AUTH_BASE_URL!).origin;

/** Deploy-time env, declared in neon.ts. */
const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

/* Holding an account is not the same as being the studio. Managed Auth will
   create an account for anyone who posts to the sign-up endpoint, so the only
   thing that grants access is being named here. */
const studio = new Set(list(process.env.STUDIO_EMAILS).map((e) => e.toLowerCase()));
const origins = new Set(list(process.env.STUDIO_ORIGINS));

function cors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "GET,OPTIONS",
    vary: "origin",
  };
  // Echoed only for origins we published. An unknown origin gets no header,
  // and the browser refuses the response.
  if (origins.has(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function deny(request: Request, status: number, reason: string) {
  return Response.json({ error: reason }, { status, headers: cors(request) });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(request) });
    }
    if (request.method !== "GET") return deny(request, 405, "Method not allowed");

    const header = request.headers.get("authorization");
    if (!header?.toLowerCase().startsWith("bearer ")) {
      return deny(request, 401, "Unauthorized");
    }

    let userId: string;
    try {
      const { payload } = await jwtVerify(header.slice(7), jwks, { issuer });
      if (!payload.sub) return deny(request, 401, "Unauthorized");
      userId = payload.sub;
    } catch {
      return deny(request, 401, "Unauthorized");
    }

    /* The email is read from the table rather than the token: Managed Auth
       JWTs carry no custom claims, and a claim the caller could influence is
       not an authorization decision. */
    const account = await pool.query<{ email: string }>(
      "select email from neon_auth.user where id = $1",
      [userId],
    );
    const email = account.rows[0]?.email?.toLowerCase();
    if (!email || !studio.has(email)) return deny(request, 403, "Not a studio account");

    const { rows } = await pool.query(
      `select id, kind, name, email, message, created_at
         from inquiries
        order by created_at desc
        limit 100`,
    );

    return Response.json(
      { branch: process.env.NEON_BRANCH, count: rows.length, inquiries: rows },
      { headers: cors(request) },
    );
  },
};
