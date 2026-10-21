# Brand assets

Drop the client-supplied files here. Nothing in this folder is generated —
these are the originals from the brand package, used as delivered. Per the
brand guide the hand-drawn mark must not be redrawn or recoloured outside the
approved palette.

| File | What it is | Where it shows up |
|---|---|---|
| `logo.svg` | The ISE mark plus wordmark, vector | Site header |
| `logo-studio.svg` | The lowercase "studio" lockup | Not wired yet |
| `og.jpg` | Social share image, 1200×630 | Link previews |

## Turning the logo on

The header sets the wordmark in type until a file is here. Once `logo.svg` is
in place, set `logo` in [`lib/content.ts`](../../lib/content.ts):

```ts
logo: { src: "/brand/logo.svg", width: 120, height: 32, alt: "ISE Studio" },
```

Use the mark's real dimensions — they reserve the right space before the file
loads. Setting it back to `null` returns the header to type.

## Favicon and app icons

These use a Next.js file convention and live in `app/`, not here:

- `app/icon.svg` (or `icon.png`) — browser tab and bookmarks
- `app/apple-icon.png` — 180×180, iOS home screen

Drop a file at either path and Next.js wires it up; no code change.

## Photography

Product, project and event photography does not live in the repo at all — it
goes to UploadThing. See [`public/photography/README.md`](../photography/README.md).

This folder is only for the brand package itself: the mark, the lockup, the
share image.
