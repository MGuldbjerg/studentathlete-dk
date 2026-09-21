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
import { getAthleteInitialCounts, getAlumniCount } from "@/lib/db";
import { AthleteLetterNav } from "@/components/AthleteLetterNav";
import { GraduationHelp } from "@/components/athletes/AthleteFullList";
import { alphabetFor, letterOf, athletesAllPath } from "@/lib/athlete-letters";
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
  // Siden bruger KUN to tal og 25 bogstavtællinger. Den hentede hele
  // atletlisten og hele alumnelisten for at regne dem ud — ~3.000 rækker
  // serialiseret og pakket ud i workeren pr. visning, på en rute uden cache.
  // Tællingen sker i SQL nu (og ligger i stats_cache).
  const [initials, alumniCount, lang] = await Promise.all([
    getAthleteInitialCounts(),
    getAlumniCount(),
    currentLanguage(),
  ]);
  // Bogstavet udledes stadig af letterOf, så sprogets regler er de samme som
  // på bogstavsiderne — kun optællingen er flyttet til basen.
  const counts = new Map<string, number>();
  for (const { initial, n } of initials) {
    const l = letterOf(initial, lang);
    if (!l) continue;
    counts.set(l, (counts.get(l) ?? 0) + n);
  }
  const activeCount = initials.reduce((sum, i) => sum + i.n, 0);

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-10">
      <h1
        className="text-3xl font-bold text-ink mb-2"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {t("athletes.h1", lang)}
      </h1>
      <p className="text-muted text-sm mb-8">
        {t("athletes.active_count", lang, { n: String(activeCount) })}
        {alumniCount > 0
          ? ` · ${t("athletes.alumni_count", lang, { n: String(alumniCount) })}`
          : ""}
      </p>

      <p className="text-ink text-sm mb-6 max-w-2xl">{t("athletes.intro", lang)}</p>

      {activeCount === 0 && alumniCount === 0 ? (
        <p className="text-muted py-20 text-center">{t("athletes.none", lang)}</p>
      ) : (
        <>
          {/* Akse 1: forbogstavet. Hver profil får en kort vej ind. */}
          {activeCount > 0 && (
            <AthleteLetterNav
              alphabet={alphabetFor(lang)}
              counts={counts}
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
