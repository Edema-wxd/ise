import type { Metadata } from "next";
import { Archivo, Petrona } from "next/font/google";
import "./globals.css";

// Vietnamese subset carries the dot-below vowels (ẹ ọ) and stacked tone marks
// Yorùbá needs; latin-ext carries ṣ.
const display = Petrona({
  subsets: ["latin", "latin-ext", "vietnamese"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

const body = Archivo({
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
  variable: "--font-body",
});

const title = "Ìṣẹ́ — We are building";
const description = "Ìṣẹ́ is being built. Work is the cure for want.";

export const metadata: Metadata = {
  // Shared-link images need an absolute URL. Vercel supplies its deployment
  // URL on its own; anywhere else, set SITE_URL (e.g. https://example.com)
  // when building, since the page is prerendered.
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
  title,
  description,
  // The image itself comes from app/opengraph-image.png.
  openGraph: { title, description, siteName: "Ìṣẹ́", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
