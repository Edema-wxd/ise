"use server";

import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { previewPath } from "@/lib/preview";

/* Turning preview off needs no session check: it only takes drafts away. */

/** Leaves preview and reloads the page as the public sees it. */
export async function exitPreview(form: FormData) {
  (await draftMode()).disable();
  redirect(previewPath(form.get("path")) ?? "/");
}

/** Leaves preview without navigating, for signing out. */
export async function endPreview() {
  (await draftMode()).disable();
}
