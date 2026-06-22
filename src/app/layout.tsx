import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { CategoryNav } from "@/components/CategoryNav";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/ui/AdSlot";
import { Analytics } from "@/components/Analytics";
import { BASE_URL } from "@/lib/seo";
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
  metadataBase: new URL(BASE_URL),
  title: "StudentAthlete.dk – Dansk dækning af student athletes i USA",
  description:
    "Følg danske student athletes på amerikanske universiteter. Profiler, nyheder og sæsonopdateringer fra football, basketball, baseball og meget mere.",
  alternates: { canonical: "/" },
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
        {/* Genprøv kampkort der fejler under samtidighedsspidser (free-plan CPU,
            fejl 1102) — et retry 1-2 s senere lykkes næsten altid og lægger
            billedet i edge-cachen. Skal stå FØR billederne i DOM'en. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var tries=new WeakMap();document.addEventListener("error",function(e){var t=e.target;if(!t||t.tagName!=="IMG"||(t.src||"").indexOf("/api/og")===-1)return;var n=(tries.get(t)||0)+1;if(n>3)return;tries.set(t,n);setTimeout(function(){t.src=t.src;},900*n+Math.random()*500);},true);})();`,
          }}
        />
        <Header />
        <Suspense fallback={null}>
          <CategoryNav />
        </Suspense>
        <AdSlot slot="header-leaderboard" className="my-3" />
        {children}
        <AdSlot slot="pre-footer" className="my-6" />
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
