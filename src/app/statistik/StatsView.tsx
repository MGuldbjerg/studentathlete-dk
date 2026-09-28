import Link from "next/link";
import type { SiteStats, StatsBlock, Tally } from "@/lib/athlete-stats";
import { NATIONS, type Nation } from "@/lib/home-nation";
import { languagePack, routePath, sportLabel, t } from "@/lib/i18n";

function pct(n: number, total: number): string {
  return total ? `${Math.round((n / total) * 100)}%` : "–";
}

/** Women / men / unknown as a thin stacked bar. */
function GenderBar({ t: tally }: { t: Tally }) {
  if (!tally.total) return null;
  const w = (n: number) => `${(n / tally.total) * 100}%`;
  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-border" aria-hidden>
      <div style={{ width: w(tally.f), backgroundColor: "#BF0A30" }} />
      <div style={{ width: w(tally.m), backgroundColor: "#00205B" }} />
      <div style={{ width: w(tally.u), backgroundColor: "#9ca3af" }} />
    </div>
  );
}

function TallyTable({
  rows,
  label,
  lang,
}: {
  rows: Array<{ name: string } & Tally>;
  label: string;
  lang: string;
}) {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
            <th className="py-2 pr-3 font-semibold">{label}</th>
            <th className="py-2 px-2 font-semibold text-right">{t("stats.women", lang)}</th>
            <th className="py-2 px-2 font-semibold text-right">{t("stats.men", lang)}</th>
            <th className="py-2 px-2 font-semibold text-right">{t("stats.unknown", lang)}</th>
            <th className="py-2 pl-2 font-semibold text-right">{t("stats.total_col", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/60">
              <td className="py-2 pr-3 text-ink">
                {r.name}
                <div className="mt-1 max-w-40"><GenderBar t={r} /></div>
              </td>
              <td className="py-2 px-2 text-right">{r.f}</td>
              <td className="py-2 px-2 text-right">{r.m}</td>
              <td className="py-2 px-2 text-right text-muted">{r.u}</td>
              <td className="py-2 pl-2 text-right font-semibold text-ink">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Block({ block, lang }: { block: StatsBlock; lang: string }) {
  const tot = block.totals;
  const locale = languagePack(lang).locale;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <Stat locale={locale} value={tot.total} label={t("stats.total", lang)} strong />
        <Stat locale={locale} value={tot.f} label={`${t("stats.women", lang)} · ${pct(tot.f, tot.total)}`} color="#BF0A30" />
        <Stat locale={locale} value={tot.m} label={`${t("stats.men", lang)} · ${pct(tot.m, tot.total)}`} color="#00205B" />
        <Stat locale={locale} value={tot.u} label={`${t("stats.unknown", lang)} · ${pct(tot.u, tot.total)}`} color="#6b7280" />
      </div>
      <p className="text-xs text-muted mb-10">{t("stats.gender_note", lang)}</p>

      <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-muted mb-2">{t("stats.by_sport", lang)}</h2>
      <div className="mb-10">
        <TallyTable
          lang={lang}
          label={t("stats.sport", lang)}
          rows={block.bySport.map((s) => ({ ...s, name: sportLabel(s.sport, lang) }))}
        />
      </div>

      <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-muted mb-2">{t("stats.by_division", lang)}</h2>
      <TallyTable
        lang={lang}
        label={t("stats.division", lang)}
        rows={block.byDivision.map((d) => ({ ...d, name: d.division }))}
      />
    </>
  );
}

function Stat({ value, label, color, strong, locale }: { value: number; label: string; color?: string; strong?: boolean; locale: string }) {
  return (
    <div className="rounded-lg border border-border bg-paper p-4">
      <div
        className={`${strong ? "text-3xl" : "text-2xl"} font-bold tabular-nums`}
        style={{ color: color ?? "var(--color-ink)", fontFamily: "var(--font-serif)" }}
      >
        {value.toLocaleString(locale)}
      </div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}

/** The page body, shared by /statistics and /statistics/<nation>. */
export function StatsView({
  stats,
  computedAt,
  lang,
  country,
  nation,
}: {
  stats: SiteStats;
  computedAt: string;
  lang: string;
  country: string;
  nation: Nation | null;
}) {
  const block = nation ? stats.nations[nation] : stats.all;
  const base = routePath("stats", lang);
  const date = new Date(computedAt.replace(" ", "T") + "Z").toLocaleDateString(languagePack(lang).locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <p className="text-sm text-muted mb-6">{t("stats.updated", lang, { date })}</p>

      {country === "UK" && (
        <nav className="flex flex-wrap gap-2 mb-8" aria-label={t("stats.crumb", lang)}>
          {[null, ...NATIONS].map((n) => {
            const active = n === nation;
            return (
              <Link
                key={n ?? "all"}
                href={n ? `${base}/${n}` : base}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  active ? "text-white border-transparent" : "border-border bg-paper text-ink hover:bg-surface"
                }`}
                style={active ? { backgroundColor: "#00205B" } : undefined}
              >
                {n ? t(`stats.nation.${n}` as const, lang) : t("stats.all_uk", lang)}
                {n && stats.nations[n] ? ` · ${stats.nations[n]!.totals.total}` : ""}
              </Link>
            );
          })}
        </nav>
      )}

      {block && <Block block={block} lang={lang} />}

      {country === "UK" && !nation && stats.nationUnknown > 0 && (
        <p className="text-xs text-muted mt-6">
          {t("stats.nation_note", lang, { unknown: String(stats.nationUnknown) })}
        </p>
      )}
    </>
  );
}
