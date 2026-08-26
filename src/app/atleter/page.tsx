/**
 * Atlet-sektionens forside — et NIVEAU OVER de målrettede sider.
 *
 * Indtil 2026-08-26 var det her hele listen: 2.343 links på én upagineret
 * side, og den eneste vej ind til profilerne. Nu præsenterer siden akserne —
 * forbogstav og hele listen — og lader de målrettede sider bære indholdet.
 * Selve listen bor på `/athletes/all` · `/atleter/alle`.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getAllAthletes, getAlumniAthletes } from "@/lib/db";
import { AthleteLetterNav } from "@/components/AthleteLetterNav";
import { GraduationHelp } from "@/components/athletes/AthleteFullList";
import { alphabetFor, countByLetter, athletesAllPath } from "@/lib/athlete-letters";
import { t, routePath } from "@/lib/i18n";
import { currentLanguage, currentSite } from "@/lib/site-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [lang, site] = await Promise.all([currentLanguage(), currentSite()]);
  return {
    title: `${t("athletes.meta_title", lang)} | ${site.brand}`,
    description: t("athletes.meta_description", lang),
    alternates: { canonical: routePath("athletes", lang) },
  };
}

export default async function AtleterPage() {
  const [active, alumni, lang] = await Promise.all([
    getAllAthletes(),
    getAlumniAthletes(),
    currentLanguage(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-10">
      <h1
        className="text-3xl font-bold text-ink mb-2"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {t("athletes.h1", lang)}
      </h1>
      <p className="text-muted text-sm mb-8">
        {t("athletes.active_count", lang, { n: String(active.length) })}
        {alumni.length > 0
          ? ` · ${t("athletes.alumni_count", lang, { n: String(alumni.length) })}`
          : ""}
      </p>

      <p className="text-ink text-sm mb-6 max-w-2xl">{t("athletes.intro", lang)}</p>

      {active.length === 0 && alumni.length === 0 ? (
        <p className="text-muted py-20 text-center">{t("athletes.none", lang)}</p>
      ) : (
        <>
          {/* Akse 1: forbogstavet. Hver profil får en kort vej ind. */}
          {active.length > 0 && (
            <AthleteLetterNav
              alphabet={alphabetFor(lang)}
              counts={countByLetter(active, lang)}
              active={null}
              lang={lang}
            />
          )}

          {/* Akse 2: hele listen, sorterbar. */}
          <p className="mb-8">
            <Link
              href={athletesAllPath(lang)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-paper
                         px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface"
            >
              {t("athletes.all_link", lang)} →
            </Link>
          </p>

          <GraduationHelp lang={lang} />
        </>
      )}
    </main>
  );
}
