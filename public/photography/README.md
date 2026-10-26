# Photography

**Photography is not stored here.** Images go to UploadThing, which serves
them from `https://<APP_ID>.ufs.sh/f/<FILE_KEY>` through `next/image`.

This folder is kept for anything that genuinely has to ship with the repo —
an OG fallback, a print asset. For the site's product, project and event
photography, use UploadThing.

## Getting an image onto the site

1. Upload it in the UploadThing dashboard. No app configuration is needed for
   this — the in-app upload route stays closed by default.
2. Copy the file URL.
3. Add it to the matching entry. Content lives in Postgres
   (`content_entries`, see the main README), so that means the entry's draft
   payload, then publish; the studio editor for this is Phase 4 of
   [`docs/admin-plan.md`](../../docs/admin-plan.md). Before the database is
   seeded, edit [`lib/content-seed.ts`](../../lib/content-seed.ts) instead:

Each collection's **pieces** take a list of `photos`, lead shot first. One
photo shows on its own; two or more show as a row that swipes sideways:

```ts
{
  name: "Wide cuff",
  material: "Cast brass",
  dimension: "58 mm inner, 24 mm face",
  photos: [
    { src: "https://<APP_ID>.ufs.sh/f/<FILE_KEY>", alt: "Wide cuff, front" },
    { src: "https://<APP_ID>.ufs.sh/f/<FILE_KEY>", alt: "Wide cuff, worn on the wrist" },
  ],
}
```

A piece saved with a single `image` instead still works: it reads as a list of
one. Collections, projects and events take a single `image` for their lead
picture. Wherever a photo is absent the studio motif stands in, labelled
"Photography to come", at the same aspect ratio — so adding the URL swaps the
image in without the layout moving.

Upload at 2000px on the long edge or larger. `next/image` generates the
responsive sizes, so do not pre-cut thumbnails.

## Alt text

`ImageSlot` takes a `describes` prop and uses it as alt text. The pages build
it from the content — a piece's name and material, a project's title. A
photo's own `alt` wins when set; give one to every photo of a piece that has
several, or they all read as the same shot. If you change what an image
shows, change that text with it; on a visual portfolio it is most of the
on-page SEO.
