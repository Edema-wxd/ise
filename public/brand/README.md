# Brand assets

Drop the client-supplied files here. Nothing in this folder is generated —
these are the originals from the brand package, used as delivered. Per the
brand guide the hand-drawn mark must not be redrawn or recoloured outside the
approved palette.

| File | What it is | Where it shows up |
|---|---|---|
| `logo.svg` | The ISE mark, black line art on transparent, vector | Site header, favicon |
| `logo-outline.svg` | The same mark in black with a white outline | Not used; for stickers and photography |
| `logo-studio.svg` | The lowercase "studio" lockup | Not delivered yet |

The client's brand sheet and moodboard are reference, not site assets, so
they live in [`docs/brand/`](../../docs/brand/) where they are not served.

## How the logo is shown

The `logo` setting (seeded from `LOGO` in
[`lib/content-seed.ts`](../../lib/content-seed.ts), editable in the studio)
points at `logo.svg` with its real dimensions. The header is eggplant, where black line art disappears,
so [`site-header.tsx`](../../components/site-header.tsx) uses the file as a
CSS mask filled with the `--paper` token. The file is shown exactly as drawn
and never edited; the brand sheet itself shows the mark in palette colours.
Setting the logo to `null` returns the header to the wordmark in type.

## Favicon and app icons

These use a Next.js file convention and live in `app/`, not here:

- `app/icon.svg`, browser tab and bookmarks: `logo.svg`'s paths in eggplant
  on a paper tile, as on the brand sheet
- `app/apple-icon.png`, 180×180 for iOS home screens: the same tile, full
  bleed, since iOS rounds the corners itself
- `app/opengraph-image.png`, 1200×630 link preview: a capture of the home
  page, with its alt text in `opengraph-image.alt.txt`

Regenerate these from `logo.svg` if the mark changes; do not redraw it.

## Photography

Product, project and event photography does not live in the repo at all — it
goes to UploadThing. See [`public/photography/README.md`](../photography/README.md).

This folder is only for the brand package itself: the mark, the lockup, the
share image.
