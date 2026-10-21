import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

/**
 * Upload endpoints for studio media.
 *
 * SECURE BY DEFAULT: this site has no user accounts, and a Server Action or
 * route handler that accepts uploads is reachable by anyone who finds the URL.
 * So uploads are refused unless `UPLOADTHING_UPLOAD_SECRET` is set and the
 * request presents it. With the variable unset — which is how the repo ships —
 * every upload is rejected and the endpoint is inert.
 *
 * That is deliberate: files can be uploaded from the UploadThing dashboard
 * today without this route being open at all. Open it only when there is a
 * studio-facing uploader to put behind it, and replace the shared secret with
 * a real session check at that point.
 */
function assertStudio(req: Request) {
  const secret = process.env.UPLOADTHING_UPLOAD_SECRET;

  if (!secret) {
    throw new UploadThingError(
      "Uploads are closed. Set UPLOADTHING_UPLOAD_SECRET to open this endpoint.",
    );
  }

  if (req.headers.get("x-studio-secret") !== secret) {
    throw new UploadThingError("Unauthorized");
  }

  return { uploadedBy: "studio" as const };
}

export const ourFileRouter = {
  /** Product, project and event photography. */
  studioMedia: f({
    image: { maxFileSize: "8MB", maxFileCount: 20 },
  })
    .middleware(async ({ req }) => assertStudio(req))
    .onUploadComplete(async ({ file }) => {
      // Nothing persists the URL yet — paste it into lib/content.ts. If an
      // uploader gets built, write it to Neon here instead.
      console.log("uploadthing: stored", file.ufsUrl);
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
