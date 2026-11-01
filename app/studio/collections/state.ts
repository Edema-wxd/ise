import type { FieldErrors } from "@/lib/studio/collections";

/*
  Shapes shared by the studio forms and their Server Actions. Kept out of
  `actions.ts` because a "use server" module may only export async functions.
*/

export type EditorState = {
  status: "idle" | "saved" | "published" | "invalid" | "error" | "conflict";
  message: string;
  errors: FieldErrors;
  /** The row's `updated_at` after the last successful save, so the next save
   *  passes the concurrency check without a reload. */
  updatedAt: string;
};

export type NewCollectionState = { error: string };
