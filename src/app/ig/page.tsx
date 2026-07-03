import type { Metadata } from "next";
import Link from "next/link";
import { getLatestArticles } from "@/lib/db";
import { getArticleUrl, getArticleCoverUrl, formatDateShort } from "@/lib/seo";

/**
 * Link-i-bio-side til Instagram (Instagram tillader ikke klikbare links i
 * captions — profilens ene bio-link peger her). Mobil-først: seneste artikler
 * som store tryk-mål + indgange til forsiden/atleter.
 * noindex — siden er en distributionskanal, ikke søge-indhold.
 */
export const metadata: Metadata = {
  title: "Seneste nyt | StudentAthlete.dk",
  description: "Seneste artikler fra StudentAthlete.dk — danske college-atleter i USA.",
  robots: { index: false, follow: true },
};

export const revalidate = 300;

export default async function IgLandingPage() {
  const articles = await getLatestArticles(12);

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-md mx-auto px-4 py-8">
        <h1
          className="text-2xl font-bold text-ink mb-1 text-center"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          StudentAthlete.dk
        </h1>
        <p className="text-sm text-muted text-center mb-6">
          Danske college-atleter i USA — seneste nyt
        </p>

        <div className="flex flex-col gap-3 mb-8">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={getArticleUrl(a)}
              className="block bg-paper rounded-xl border border-border overflow-hidden active:scale-[0.99] transition-transform"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getArticleCoverUrl(a)}
                alt=""
                className="w-full aspect-[1200/630] object-cover"
                loading="lazy"
              />
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted mb-1">
                  {a.sport ?? ""}{a.published_at ? ` · ${formatDateShort(a.published_at)}` : ""}
                </p>
                <h2
                  className="text-base font-bold text-ink leading-snug"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {a.title}
                </h2>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="block text-center py-3 rounded-xl font-semibold text-white"
            style={{ backgroundColor: "#00205B" }}
          >
            Alle artikler
          </Link>
          <Link
            href="/atleter"
            className="block text-center py-3 rounded-xl font-semibold border border-border bg-paper text-ink"
          >
            Alle danske atleter
          </Link>
          <Link
            href="/viden"
            className="block text-center py-3 rounded-xl font-semibold border border-border bg-paper text-ink"
          >
            Guides: sådan fungerer college-sport
          </Link>
        </div>
      </div>
    </main>
  );
}
