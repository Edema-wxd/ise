import { collectionSpec } from "./collection";
import { eventSpec } from "./event";
import { projectSpec } from "./project";
import type { KindSpec } from "./shared";

export type Kind = "collection" | "project" | "event";

/** Every kind the studio edits, in nav order. */
export const KINDS: Record<Kind, KindSpec<any>> = {
  collection: collectionSpec,
  project: projectSpec,
  event: eventSpec,
};

export function isKind(value: unknown): value is Kind {
  return typeof value === "string" && Object.hasOwn(KINDS, value);
}

export type { KindSpec, FieldErrors } from "./shared";
export { slugify } from "./shared";
