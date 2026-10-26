import type { NeonAuth } from "@neondatabase/auth/next/server";
import { getAuth } from "@/lib/auth/server";

type Handlers = ReturnType<NeonAuth["handler"]>;
type Context = Parameters<Handlers["GET"]>[1];

/** Same-origin proxy to the branch's Managed Auth service. The browser client
 *  talks to this, never to the Neon Auth URL directly. Unconfigured, it
 *  answers 503 rather than taking the build down with it. */
function forward(method: keyof Handlers) {
  return (request: Request, context: Context) => {
    const auth = getAuth();
    if (!auth) {
      return Response.json({ error: "Studio sign-in is not configured" }, { status: 503 });
    }
    return auth.handler()[method](request, context);
  };
}

export const GET = forward("GET");
export const POST = forward("POST");
export const PUT = forward("PUT");
export const DELETE = forward("DELETE");
export const PATCH = forward("PATCH");
