import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getStudioAccess } from "@/lib/studio/session";

const f = createUploadthing();

/**
 * Upload endpoint for studio photography, used by the upload buttons in the
 * studio editors (app/studio/photo-upload.tsx).
 *
 * The route is public, like any route handler, so the check is in the
 * middleware: the same session-and-allowlist rule every studio page and
 * Server Action applies (lib/studio/session.ts). It fails closed. With Neon
 * Auth or the database unconfigured, or a caller who is signed out or not on
 * `STUDIO_EMAILS`, nothing is uploaded.
 *
 * `UPLOADTHING_TOKEN` is what ties this route to the studio's UploadThing
 * app. Without it UploadThing itself refuses the upload.
 */
async function assertStudio() {
  const access = await getStudioAccess();
  if (!access.ok) {
    throw new UploadThingError(
      access.reason === "unconfigured" ? "Studio sign-in is not set up." : "Sign in to the studio to upload.",
    );
  }
  return { uploadedBy: access.email };
}

export const ourFileRouter = {
  /** Collection, project and event photography. */
  studioMedia: f(
    { image: { maxFileSize: "16MB", maxFileCount: 20 } },
    /* The editor takes the link from the upload itself, so it need not wait
       for UploadThing's callback to this server. That keeps a phone upload
       quick, and working on a preview URL the callback cannot reach. */
    { awaitServerData: false },
  )
    .middleware(() => assertStudio())
    .onUploadComplete(({ file, metadata }) => {
      // The link goes back to the editor, which puts it in the draft. Nothing
      // is public until that draft is published.
      console.log("uploadthing: stored", file.ufsUrl, "for", metadata.uploadedBy);
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
