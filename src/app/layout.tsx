import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { CategoryNav } from "@/components/CategoryNav";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/ui/AdSlot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "StudentAthlete.dk – Dansk dækning af student athletes i USA",
  description:
    "Følg danske student athletes på amerikanske universiteter. Profiler, nyheder og sæsonopdateringer fra football, basketball, baseball og meget mere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="StudentAthlete.dk"
          href="/feed.xml"
        />
        {/* Cloudflare Web Analytics (klient-side backup til D1-tracking)
            Token hentes i: CF Dashboard → Analytics → Web Analytics → Add site
            Aktiver ved at uncommente linjen nedenfor og indsætte din token: */}
        {/* <script defer src="https://static.cloudflare.com/insights/metrics/script.min.js" spa="true" data-cf-beacon='{"token":"DIN_TOKEN_HER"}' /> */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        <Header />
        <Suspense fallback={null}>
          <CategoryNav />
        </Suspense>
        <AdSlot slot="header-leaderboard" className="my-3" />
        {children}
        <AdSlot slot="pre-footer" className="my-6" />
        <Footer />
      </body>
    </html>
  );
}
