@AGENTS.md
# CLAUDE.md — Isestudiong.com Portfolio Site

This file guides Claude Code (or any AI coding assistant) when working in this repository. It covers the brand system, scope, and technical conventions for the ISE Studio (Isestudiong) portfolio website. **Follow the brand guide strictly** — colors, fonts, and tone are locked, not suggestions.

## Project Summary

Custom-coded portfolio website for ISE Studio (Excellence Olujide / Isestudiong.com), a Nigerian-rooted industrial design studio making jewelry, accessories, apparel, and wood/3D objects. This phase is **portfolio only** — no e-commerce checkout. Product interest is routed to a "Custom Orders" prompt (email/DM), not a cart. A Shopify storefront is a confirmed but deferred future phase; do not build storefront, cart, or checkout functionality now.

Reference: see the project's Scope of Work document for full deliverables, phased timeline, and client responsibilities. This file is the day-to-day build reference; the SOW is the contractual source of truth if the two ever disagree.

## Tech Stack

- **Framework**: React / Next.js (App Router)
- **Styling**: Tailwind CSS (or CSS Modules) driven entirely by the design tokens below — no ad hoc colors
- **Hosting**: production-grade Node.js-compatible host (final choice to be confirmed with the client separately)
- **Forms**: general contact form + a distinct "Custom Orders" inquiry form/prompt (email or DM handle, provided by client)
- **Analytics**: Google Analytics or Plausible (either is acceptable, confirm with client)
- **Images**: served via Next.js `<Image>` for optimization; source photography comes from client-provided galleries (see Content Sources below)

## Brand Identity

### Logo
Hand-drawn line-art mark combining an abstract face/hand/mask motif with the "ISE" wordmark, plus a separate lowercase "studio" lockup. Use the client-supplied logo files (vector/SVG preferred) — do not redraw or recreate the mark. Preserve clear space around it; do not recolor the line art outside the approved palette.

### Aesthetic Direction: "Afro-Maximalist Futurism"
This is the guiding creative concept for the entire site: bold pattern and color used with intention, culturally rooted African visual motifs, combined with a clean, modern/futuristic structural layout. Avoid generic minimalist "portfolio template" looks — the site should feel maximalist in color/texture but disciplined in layout and typographic hierarchy.

### Brand Voice
Bold, curious, culturally grounded, playful, and design-led. Write and structure copy with "the confidence of a designer, the instinct of an artist, and the hands-on spirit of a maker." Avoid corporate/generic SaaS copywriting tone. Short, confident sentences over hedged, over-explained ones.

## Color Palette (strict — do not introduce new colors)

| Role | Approx. Hex | Notes |
|---|---|---|
| Deep Red / Brick | `#9C2B28` | Primary accent, high-impact use (CTAs, dividers) |
| Eggplant / Deep Purple | `#3B1354` | Primary dark, near-black usage, headers/nav backgrounds |
| Dusty Mauve / Purple-Grey | `#6E5670` | Secondary/supporting tone, muted backgrounds |
| Coral / Salmon | `#EF8C86` | Warm accent, highlights, tags/badges |
| Peach / Blush | `#F7C7AC` | Light accent, section backgrounds, callout fills |
| Off-White / Paper | `#F4F1EF` | Base background, replaces pure white where warmth is wanted |

Hex values above are read from the shared brand swatch and should be treated as close approximations. **Before implementation, request the exact hex/RGB values or a Figma/brand asset file from the client** so tokens are pixel-accurate, then hard-code them as design tokens (Tailwind config `theme.colors`, or CSS custom properties) and reference tokens by name everywhere — never hard-code hex values inline in components.

Use pure white or pure black only if the client's source file confirms them as part of the system; the swatch shown ends in a light neutral, not confirmed pure white.

## Typography (strict)

| Use | Typeface | Weight/Size example |
|---|---|---|
| Display / Headlines | Feneon Single (or "Feneon Single (18)") | ~48pt for hero/H1, scale down proportionally for H2–H3 |
| Subheadings / UI | Space Grotesk | Light, ~24pt |
| Body / Small text | Kinesis Pro 3 | Light, ~14pt |

Notes:
- These are the client's brand fonts. Confirm licensing and obtain webfont files (WOFF2) directly from the client or their type foundry before launch — do not substitute with a "close enough" Google Font in the final build. If a webfont license isn't available in time for early development, use a clearly-labeled temporary fallback stack (e.g., a serif for Feneon Single, `Space Grotesk` from Google Fonts as-is since it's open source, and a light grotesk/humanist sans for Kinesis Pro 3) and flag it for swap-out before launch.
- Space Grotesk is available for free on Google Fonts, so that tier can be implemented directly.
- Maintain the type hierarchy shown: display serif for impact headlines, geometric sans for structure/navigation, and a light body face for readable copy. Don't mix in additional typefaces.

## Site Structure (current phase)

Informed by the client's existing `isestudio.myportfolio.com` IA and the "ISE: Work at 25" exhibition site tone (see SOW Section 3 for full references reviewed):

- **Home** — full-bleed hero imagery, short narrative intro in brand voice, clear paths into Products and Projects
- **Products** — organized by category (jewelry & accessories, afrocentric & gemstone pieces, engraved wood accessories, apparel, 3D design, etc.) — display only, no cart/checkout
- **Projects / Case Studies** — design projects with process/story context
- **Events / Exhibitions** — past shows (e.g., ISE Pop-Up Shop, exhibition photography)
- **Custom Orders / Contact** — email/DM prompt for custom piece inquiries, plus a general contact form

Exact category list and final copy are confirmed with the client during Discovery — treat the above as the working structure, not a rigid final spec.

## Content Sources

- Client-provided product/event photography (originally shared via iCloud albums; request a Drive/Dropbox export for direct dev access, since iCloud share links require sign-in)
- Existing `isestudio.myportfolio.com` and `workat25.myportfolio.com` content, for reference on tone/structure only — do not copy their code or templates directly, this is a fully custom build
- Copywriting, professional photography, and logo/brand design are out of scope for this engagement (see SOW exclusions) — build with client-provided assets

## Explicitly Out of Scope (do not build)

- Shopping cart, checkout, payment integration, or any Shopify wiring — this is a future phase
- Product inventory/stock management
- Paid ad tracking pixels beyond basic analytics
- CMS backend, unless separately agreed — confirm before adding one

## Working Conventions

- Keep components small and reusable; the category-driven Products page should use a single data-driven template, not one-off pages per category
- Respect the strict brand palette and type scale above in every component — if a design need falls outside them, flag it rather than improvising a new color/font
- Mobile-first responsive build; verify at mobile, tablet, and desktop breakpoints before marking any page done
- Optimize all images (compression, responsive `srcset`) given the photography-heavy nature of the site
- Basic on-page SEO on every page: meta title/description, sitemap.xml, descriptive alt text (especially important for a visually-driven portfolio)