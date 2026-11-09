/**
 * Local preview of the season-honours page, computed from the database, without a deploy.
 *   npx tsx scripts/_preview-season-honours.tsx <out.html> [UK] [soccer]
 * Renders the real component with the stored data; the CSS is the Tailwind CDN,
 * so fonts and spacing are close, not exact.
 */
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createD1Client } from "../pipeline/lib/d1-client";
import { seasonHonoursFor } from "../pipeline/report/build-stats";
import { SeasonHonoursView, seasonYear } from "../src/components/SeasonHonoursView";
import type { SeasonHonours } from "../src/lib/season-honours";
import { sportLabel, t } from "../src/lib/i18n";
import { formatDate } from "../src/lib/seo";

async function main() {
  const [out, country = "UK", sport = "soccer"] = process.argv.slice(2);
  const lang = country === "DK" ? "da" : "en";
  const db = createD1Client();
  // Computed here, not read from stats_cache: the preview works before the
  // site's switch (seasonHonourSports) is on.
  const h: SeasonHonours = (await seasonHonoursFor(db, country, sport)).honours;
  const s = sportLabel(sport, lang).toLowerCase();
  const body = renderToStaticMarkup(
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
      <p className="text-xs text-muted">Home › Statistics › {t("awards.title", lang, { season: h.season })} › {sportLabel(sport, lang)} {seasonYear(h.season)}</p>
      <h1 className="text-3xl font-bold text-ink mt-6 mb-3" style={{ fontFamily: "Georgia, serif" }}>{t("honours.title", lang, { sport: s, year: seasonYear(h.season) })}</h1>
      <p className="text-sm text-ink/80 mb-3 max-w-2xl border-l-4 pl-3" style={{ borderColor: "#BF0A30" }}>{t("honours.intro", lang, { sport: s })}</p>
      <p className="text-lg font-semibold text-ink mt-6 mb-1">{t("honours.total", lang, { n: String(h.honours), m: String(h.athletes), c: String(h.conferences) })}</p>
      <p className="text-xs text-muted mb-6">{t("board.as_of", lang, { date: formatDate(h.asOf, lang, { day: "numeric", month: "long", year: "numeric" }) })}</p>
      <SeasonHonoursView honours={h} lang={lang} />
      <p className="text-sm text-ink/80 mt-10 max-w-2xl leading-relaxed">{t("honours.method", lang)}</p>
    </main>,
  );
  writeFileSync(out, `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{colors:{ink:"#1A1A1A",muted:"#6B6B6B"}}}}</script></head><body class="bg-white">${body}</body></html>`);
  console.log(`${out}: ${h.honours} honours, ${h.athletes} athletes`);
}
main().catch((e) => { console.error(e); process.exit(1); });
