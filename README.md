# Ìṣẹ́

A holding screen. One route, prerendered as static HTML. The animation is CSS
only: the page ships nothing beyond the small Next.js runtime.

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint       # ESLint, Next.js core-web-vitals + TypeScript rules
npm run typecheck
```

The build downloads Petrona and Archivo from Google Fonts, so it needs network
access.

## Deploying

Production is on Vercel at https://www.isestudiong.com (the bare domain
redirects there; also https://ise-beryl.vercel.app). Shared links point their
preview image at the www domain. To host it elsewhere, set `SITE_URL` to the
public address when building. The page is prerendered, so setting it only at
start is too late:

```bash
SITE_URL=https://example.com npm run build
npm start
```

The favicon is `app/icon.svg`, and `app/apple-icon.png` is the same mark at
180px for iOS home screens. `app/opengraph-image.png` is the link preview: a
1200×630 capture of the page with reduced motion on, so the band shows as a
still gradient. Recapture it if the page changes.

## The design

Built on **adire eléko**, the Yorùbá indigo resist cloth: cassava paste is
painted onto cotton in motifs, the cloth is dipped, and the paste keeps the dye
out. Cloth goes into the vat repeatedly, deepening with each pass.

That process is the loading indicator. [components/adire-band.tsx](components/adire-band.tsx)
lays out strips of hand-drawn resist motifs; each strip runs the same
`dip` keyframes offset by a negative delay, so the deepening travels across the
band and never finishes. Under `prefers-reduced-motion` the strips pause rather
than stop, freezing each at its own depth so the band settles into a still
gradient instead of going flat.

Two materials only, per the craft: indigo at four depths and undyed cotton
(`app/globals.css`). The type is Petrona for display and Archivo for utility —
both chosen partly because they position Yorùbá tone marks over dot-below
vowels correctly, which several otherwise-good faces do not.

To reuse the band elsewhere (a route-level `app/loading.tsx`, a suspense
fallback), import `AdireBand` — it is a server component and takes no props.
