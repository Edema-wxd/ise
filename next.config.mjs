/**
 * Images are served from UploadThing, which hosts them per app at
 * `https://<APP_ID>.ufs.sh/f/<FILE_KEY>`.
 *
 * With UPLOADTHING_APP_ID set, the pattern pins to that one app. Without it,
 * it falls back to any UploadThing subdomain so the build still works in a
 * checkout with no env — set the variable in production to narrow it.
 */
const appId = process.env.UPLOADTHING_APP_ID;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: appId ? `${appId}.ufs.sh` : "*.ufs.sh",
        pathname: "/f/*",
      },
    ],
  },

  /*
    Cache Components: data access is dynamic unless a `use cache` scope says
    otherwise, and each cached scope can be invalidated by tag. The content
    readers in lib/content.ts are those scopes, so the public pages still
    prerender while a publish in the studio invalidates exactly what changed.

    It is also what makes preview work without giving up static pages:
    `draftMode().isEnabled` is readable inside a cache scope, and draft mode
    makes those scopes re-execute per request instead of serving the cache.

    See node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md
  */
  cacheComponents: true,
};

export default nextConfig;
