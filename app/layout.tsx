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

export const metadata: Metadata = {
  title: "Ìṣẹ́ — We are building",
  description: "Ìṣẹ́ is being built. Work is the cure for want.",
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
