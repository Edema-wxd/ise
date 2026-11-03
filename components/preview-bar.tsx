import { draftMode } from "next/headers";
import { PreviewBarView } from "./preview-bar-view";

/**
 * The bar shown while the studio is previewing drafts, on every page of the
 * site. Nothing renders for anyone else: draft mode is only turned on by
 * app/studio/preview/route.ts, behind the studio's session check.
 */
export async function PreviewBar() {
  const { isEnabled } = await draftMode();
  return isEnabled ? <PreviewBarView /> : null;
}
