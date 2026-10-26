/**
 * Neon Function: the studio's inquiries feed, and the hourly digest.
 *
 * It runs in the same region as the branch's Postgres, so reading the table is
 * a local hop rather than a round trip from wherever the site is hosted, and it
 * branches with the database — a preview branch reads that branch's rows.
 *
 * Two callers, two paths, two ways of being authenticated:
 *
 *   GET  /         the browser, from /studio, with a Managed Auth bearer token
 *   POST /digest   a Neon Function Trigger on a cron, with its invocation id
 *
 * A Neon Function has a public HTTPS URL, so nothing stands in front of it:
 * both paths verify their own caller before a row is read. The trigger path
 * deliberately has no bearer check — Neon's trigger POSTs do not carry one.
 */
import { attachDatabasePool } from "@neon/functions";
import { parseTriggerDelivery } from "@neon/functions/triggers";
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

/* Where the digest posts a new inquiry: a Slack or Zapier hook, an email
   relay, anything that answers 2xx. Optional, and omitted from neon.ts when
   unset rather than written as an empty string, which would delete the live
   key. With no destination the digest reports that and leaves the rows alone,
   so nothing is ever marked delivered that was not. */
const webhook = process.env.STUDIO_WEBHOOK_URL;

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

/**
 * The hourly tick: hand the studio whatever it has not been told about yet.
 *
 * `notified_at` is stamped only after the destination accepts the batch, so a
 * webhook that is down means the next tick tries the same rows again rather
 * than losing them. Delivery is one POST for the batch, not one per row: an
 * hour of inquiries is a handful at most, and a digest is what somebody
 * actually wants to read.
 */
async function digest(request: Request): Promise<Response> {
  const parsed = await parseTriggerDelivery(request);
  if (!parsed.ok) {
    // A missing or mismatched invocation id is somebody else knocking.
    return new Response(parsed.error, {
      status: parsed.error === "invalid_body" ? 400 : 401,
    });
  }

  /* Housekeeping on the same tick: the limiter's rows are only interesting
     for an hour, and nothing else would ever sweep them. */
  const pruned = await pool.query(
    "delete from inquiry_attempts where created_at < now() - interval '1 day'",
  );

  const { rows } = await pool.query(
    `select id, kind, name, email, message, created_at
       from inquiries
      where notified_at is null
      order by created_at
      limit 100`,
  );

  if (rows.length === 0) {
    return Response.json({ pending: 0, delivered: 0, pruned: pruned.rowCount });
  }

  if (!webhook) {
    return Response.json({
      pending: rows.length,
      delivered: 0,
      pruned: pruned.rowCount,
      // Said out loud rather than logged: a digest with nowhere to go is a
      // configuration gap, and the rows are still waiting.
      error: "STUDIO_WEBHOOK_URL is not set, so nothing was delivered",
    });
  }

  let response: Response;
  try {
    response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branch: process.env.NEON_BRANCH,
        count: rows.length,
        inquiries: rows,
      }),
    });
  } catch (error) {
    console.error("digest: webhook unreachable", error);
    return Response.json(
      { pending: rows.length, delivered: 0, error: "webhook unreachable" },
      { status: 502 },
    );
  }

  if (!response.ok) {
    console.error(`digest: webhook answered ${response.status}`);
    return Response.json(
      {
        pending: rows.length,
        delivered: 0,
        error: `webhook answered ${response.status}`,
      },
      { status: 502 },
    );
  }

  await pool.query("update inquiries set notified_at = now() where id = any($1)", [
    rows.map((row) => row.id),
  ]);

  return Response.json({
    pending: 0,
    delivered: rows.length,
    pruned: pruned.rowCount,
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    // Routed before any bearer check: the trigger authenticates differently.
    if (new URL(request.url).pathname === "/digest") return digest(request);

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
