import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { CategoryNav } from "@/components/CategoryNav";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/ui/AdSlot";
import { Analytics } from "@/components/Analytics";
import { CookieConsent } from "@/components/CookieConsent";
import { BASE_URL } from "@/lib/seo";
import { getSiteSettings } from "@/lib/admin";
import { adsenseIds } from "@/lib/site-content";
import { ga4Id, ga4Snippet } from "@/lib/ga4";
import { currentLanguage, currentBaseUrl, currentSite } from "@/lib/site-server";
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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: new URL(await currentBaseUrl()),
    title: settings["site.title"],
    description: settings["site.description"],
    alternates: { canonical: "/" },
    // Dark launch — se `darkLaunch` i landeprofilen. Enkelte sider sætter selv
    // `robots: { index: true }` og ville overskrive den her, så middlewaren
    // sender DESUDEN en X-Robots-Tag-header. Denne er bæltet, den er selerne.
    ...((await currentSite()).darkLaunch
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const adsense = adsenseIds(settings["adsense.publisher_id"]);
  const adsScript = settings["adsense.enabled"] === "true";
  // GA4 rides on the AdSense consent banner: without that banner there is no
  // consent to read, so no GA4 either.
  const ga4 = adsense && adsScript ? ga4Id(settings["ga4.measurement_id"]) : null;
  const lang = await currentLanguage();
  return (
    <html lang={lang}>
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title={settings["site.title"]}
          href="/feed.xml"
        />
        {/* AdSense-ejerskabsverifikation. Kun et navneskilt — indlæser INTET
            script og sætter ingen cookies, så sitet forbliver cookieløst indtil
            annoncer reelt slås til. Udfyldes i admin → Tekster; tomt felt =
            intet tag. Se også /ads.txt, som bærer samme ID. */}
        {adsense && <meta name="google-adsense-account" content={adsense.account} />}

        {/* GA4 consent defaults. React hoists the async gtag.js and AdSense
            <script src> tags above this inline one (seen live 2026-10-07), so
            the guarantee is the dataLayer ORDER, not the script order: the
            snippet pushes consent 'default' before 'config', and GA4 sends
            nothing before 'config'. Storage stays denied in the EEA/UK until
            Google's banner grants it. AdSense reads the TCF signal instead. */}
        {ga4 && <script dangerouslySetInnerHTML={{ __html: ga4Snippet(ga4) }} />}
        {ga4 && <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} />}

        {/* AdSense-scriptet. Ét tag leverer TRE ting: auto ads, Googles
            certificerede CMP (samtykkeboksen serveres af auto-ads-scriptet —
            der skal ikke tilføjes CMP-kode), og ejerskabsverifikation.

            Derfor er vores egen CookieConsent slået fra: to samtykkedialoger er
            værre end én, og kun Googles er TCF-certificeret (krav i EØS/UK for
            personligt tilpassede annoncer).

            Styres af admin → Tekster (`adsense.enabled`) og ikke af en env-var,
            så det kan slukkes igen uden deploy hvis noget går galt. */}
        {adsense && adsScript && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense.account}`}
            crossOrigin="anonymous"
          />
        )}
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
            __html: `(function(){var tries=new WeakMap();document.addEventListener("error",function(e){var t=e.target;if(!t||t.tagName!=="IMG"||((t.src||"").indexOf("/og/")===-1&&(t.src||"").indexOf("/api/og")===-1))return;var n=(tries.get(t)||0)+1;if(n>3)return;tries.set(t,n);setTimeout(function(){t.src=t.src;},900*n+Math.random()*500);},true);})();`,
          }}
        />
        <Header />
        <Suspense fallback={null}>
          <CategoryNav lang={lang} />
        </Suspense>
        <AdSlot slot="header-leaderboard" className="my-3" />
        {children}
        <AdSlot slot="pre-footer" className="my-6" />
        <Footer />
        <Analytics />
        <CookieConsent enabled={settings["consent.enabled"] === "true"} lang={lang} />
      </body>
    </html>
  );
}
