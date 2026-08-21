# Ìṣẹ́

A holding screen. One route, no client JavaScript — the animation is CSS only,
and the page prerenders as static HTML.

```bash
npm install
npm run dev
```

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
