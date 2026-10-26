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
  // Shared-link images need an absolute URL. The bare domain redirects to www,
  // so www is canonical; SITE_URL overrides it at build time, since the page
  // is prerendered. Vercel preview deployments use their own URL regardless.
  metadataBase: new URL(process.env.SITE_URL ?? "https://www.isestudiong.com"),
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
