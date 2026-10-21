import { auth } from "@/lib/auth/server";

/**
 * Next 16 renamed Middleware to Proxy; the file is `proxy.ts` at the project
 * root. See `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
 *
 * This is the optimistic redirect only. `/studio` checks the session again on
 * the server before it reads a single row — a proxy check is not authorization.
 */
export default auth.middleware({ loginUrl: "/auth/sign-in" });

/*
  Scoped to the one protected route. A matcher that covered every path would
  redirect the sign-in page's own JavaScript and CSS, so the page could not
  load, and would put an auth hop in front of the public portfolio.
*/
export const config = {
  matcher: ["/studio/:path*"],
};
