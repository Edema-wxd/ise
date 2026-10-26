"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/**
 * Browser-side Neon Auth client. It takes no arguments: every call goes to the
 * same-origin proxy at `/api/auth/*`, which forwards to the branch's Auth URL.
 */
export const authClient = createAuthClient();
