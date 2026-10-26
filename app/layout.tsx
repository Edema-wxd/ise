import type { Metadata } from "next";
import { Alegreya, Bodoni_Moda, Space_Grotesk } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getLogo, getNav, getSite } from "@/lib/content";
import "./globals.css";

/*
  Type tiers, per the brand sheet: display, UI, body.

  Two of the three brand faces are licensed and not in the repo. These are the
  closest open substitutes, chosen against what the real faces actually do:

  - Feneon Single (display) -> BODONI MODA. Feneon is a neon-sign display
    family: letterforms drawn as continuous tubes, high contrast but
    monolinear, cut at several optical sizes. Nothing on Google Fonts does the
    neon tubing without becoming a novelty face, so the substitute keeps the
    two traits that carry at 48pt — extreme stroke contrast and a real optical
    size axis, which Bodoni Moda has and most display serifs do not.

  - Space Grotesk (UI) — the actual brand face. Open source, loaded as is.

  - Kinesis Pro 3 (body) -> ALEGREYA. Note that the brand sheet calls for "a
    light grotesk/humanist sans" here, which has the genre wrong: Kinesis Pro
    is a serif — calligraphic, with flared terminals and active serifs.
    Alegreya is the closest open face in that genre, so this follows the real
    typeface rather than the sheet's fallback note. Flag it if the sheet is
    right and the body tier is meant to be a sans after all.

  Alegreya's lightest weight is 400, so body text is set at 400 rather than
  the sheet's "Light"; Kinesis Pro 3 Light is lighter than anything here.

  To swap in the real faces: replace the two `next/font/google` calls with
  `next/font/local` pointing at the client's WOFF2 files, keep these variable
  names, and reset the body weight. No component changes.
*/
const display = Bodoni_Moda({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-display",
});

const ui = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ui",
});

const body = Alegreya({
  // Vietnamese carries the dot-below vowels and stacked tone marks Yoruba
  // needs; latin-ext carries the rest.
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
  variable: "--font-body",
});

/* Cached rather than static, because the title and description are now the
   studio's to edit. `use cache` keeps the pages prerenderable; a publish in
   the studio invalidates the tag the reader carries. */
export async function generateMetadata(): Promise<Metadata> {
  "use cache";

  const site = await getSite();

  return {
    metadataBase: new URL(site.url),
    title: {
      default: `${site.name} — ${site.tagline}`,
      template: `%s — ${site.name}`,
    },
    description: site.tagline,
    openGraph: {
      type: "website",
      siteName: site.name,
      url: site.url,
      title: site.name,
      description: site.tagline,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* The header is a client component, so what it needs is read here and
     handed down rather than imported there. */
  const [site, nav, logo] = await Promise.all([getSite(), getNav(), getLogo()]);

  return (
    <html
      lang="en"
      className={`${display.variable} ${ui.variable} ${body.variable}`}
    >
      <body>
        <SiteHeader siteName={site.name} nav={nav} logo={logo} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
