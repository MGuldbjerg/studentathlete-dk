/**
 * Atlet-kortet og gitteret. Flyttet ud af `app/atleter/page.tsx` 2026-08-26,
 * da bogstavsiderne (/athletes/a) skal vise atleterne PRÆCIS som oversigten —
 * to kopier ville drive fra hinanden ved første designrettelse.
 */
import Link from "next/link";
import type { Athlete } from "@/lib/types";
import { getSportColor } from "@/lib/types";
import { getAthleteUrl } from "@/lib/seo";
import { graduationBadgeYear } from "@/lib/graduation";
import { t } from "@/lib/i18n";

export function AthleteCard({ athlete, faded, lang }: { athlete: Athlete; faded?: boolean; lang: string }) {
  return (
    <Link
      href={getAthleteUrl(athlete.slug, lang)}
      className={`flex items-center gap-4 p-4 rounded-lg border border-border
                 bg-paper hover:bg-surface transition-colors group
                 ${faded ? "opacity-70" : ""}`}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center
                   text-sm font-bold text-white flex-shrink-0"
        style={{ backgroundColor: faded ? "#999" : getSportColor(athlete.sport) }}
      >
        {athlete.name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </div>

      <div className="min-w-0">
        <p
          className="text-sm font-bold text-ink leading-snug group-hover:underline truncate"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {athlete.name}
          {graduationBadgeYear(athlete.expected_graduation) && (
            <span
              className="ml-1.5"
              title={t("athletes.graduated_title", lang, {
                year: String(graduationBadgeYear(athlete.expected_graduation)),
              })}
            >
              🎓
            </span>
          )}
        </p>
        <p className="text-xs text-muted truncate">
          {athlete.university}
          {athlete.position && ` · ${athlete.position}`}
          {athlete.class_year && ` · ${athlete.class_year}`}
        </p>
      </div>
    </Link>
  );
}

export function CardGrid({ athletes, faded, lang }: { athletes: Athlete[]; faded?: boolean; lang: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {athletes.map((a) => (
        <AthleteCard key={a.id} athlete={a} faded={faded} lang={lang} />
      ))}
    </div>
  );
}
