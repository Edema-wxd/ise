import { auth } from "@/lib/auth/server";

/** Same-origin proxy to the branch's Managed Auth service. The browser client
 *  talks to this, never to the Neon Auth URL directly. */
export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
