/**
 * Ugentlig rapport — ÉN PR. LAND.
 *
 * Tallene er kun brugbare, hvis de handler om ét site: "12 artikler" siger
 * intet, når det er 12 danske og 0 britiske. Hvert land får derfor sin egen
 * besked i sin egen kanal (se `pipeline/lib/notify.ts` for webhook-opslaget).
 */
import { createD1Client } from "../lib/d1-client";
import { activeCountries, countryProfile } from "../../src/lib/countries";
import { notify, COLOR, adminLink } from "../lib/notify";

const TYPE_LABELS: Record<string, string> = {
  news: "Nyheder",
  feature: "Features",
  "season-update": "Sæsonopdateringer",
  recruiting: "Rekruttering",
};

type Db = ReturnType<typeof createD1Client>;

async function digestFor(db: Db, country: string): Promise<boolean> {
  const brand = countryProfile(country).brand;

  // Review-log: beslutningsfordeling seneste 28 dage. Fail-safe hvis tabellen
  // (migration-027) ikke findes endnu.
  let reviewLine = "";
  try {
    const rl = await db.query<{ decision: string; cnt: number }>(
      `SELECT decision, COUNT(*) as cnt FROM review_log rl
       JOIN articles a ON a.id = rl.article_id
       WHERE datetime(rl.decided_at) >= datetime('now', '-28 days') AND a.country = ?
       GROUP BY decision`,
      [country],
    );
    const counts: Record<string, number> = {};
    for (const r of rl.results) counts[r.decision] = r.cnt;
    const total = (counts.approved_as_is ?? 0) + (counts.edited ?? 0) + (counts.rejected ?? 0);
    if (total > 0) {
      reviewLine = `✅ ${counts.approved_as_is ?? 0} godkendt som-er · ✏️ ${counts.edited ?? 0} redigeret · ❌ ${counts.rejected ?? 0} afvist (28 dage)`;
    }
  } catch {
    /* review_log findes ikke endnu — udelad linjen */
  }

  const [articles, athletes, stories, totals, learning, queue] = await Promise.all([
    db.query<{ article_type: string; cnt: number }>(
      `SELECT article_type, COUNT(*) as cnt FROM articles
       WHERE datetime(created_at) >= datetime('now', '-7 days') AND country = ?
       GROUP BY article_type ORDER BY cnt DESC`,
      [country],
    ),
    db.query<{ cnt: number; names: string }>(
      `SELECT COUNT(*) as cnt, GROUP_CONCAT(name, ', ') as names FROM athletes
       WHERE datetime(created_at) >= datetime('now', '-7 days') AND home_country = ?`,
      [country],
    ),
    // stories har ingen landekolonne — landet kommer fra atleten.
    db.query<{ found: number; generated: number }>(
      `SELECT COUNT(*) as found,
              SUM(CASE WHEN s.status = 'drafted' THEN 1 ELSE 0 END) as generated
       FROM stories s JOIN athletes at ON at.id = s.athlete_id
       WHERE datetime(s.discovered_at) >= datetime('now', '-7 days') AND at.home_country = ?`,
      [country],
    ),
    db.query<{ total_articles: number; total_athletes: number; published: number }>(
      `SELECT
         (SELECT COUNT(*) FROM articles WHERE country = ?) as total_articles,
         (SELECT COUNT(*) FROM athletes WHERE active = 1 AND home_country = ?) as total_athletes,
         (SELECT COUNT(*) FROM articles WHERE published = 1 AND country = ?) as published`,
      [country, country, country],
    ),
    db.query<{ pub_week: number; unedited_week: number; pending_suggestions: number }>(
      `SELECT
         (SELECT COUNT(*) FROM articles WHERE published = 1 AND country = ?
            AND datetime(published_at) >= datetime('now', '-7 days')) as pub_week,
         (SELECT COUNT(*) FROM articles WHERE published = 1 AND country = ?
            AND datetime(published_at) >= datetime('now', '-7 days')
            AND (original_content IS NULL OR content = original_content)) as unedited_week,
         (SELECT COUNT(*) FROM style_corrections WHERE status = 'suggested') as pending_suggestions`,
      [country, country],
    ),
    db.query<{ waiting: number }>(
      `SELECT COUNT(*) as waiting FROM articles WHERE published = 0 AND country = ?`,
      [country],
    ),
  ]);

  const newArticles = articles.results.reduce((s, r) => s + r.cnt, 0);
  const newAthletes = athletes.results[0]?.cnt ?? 0;
  const storiesFound = stories.results[0]?.found ?? 0;
  const storiesGenerated = stories.results[0]?.generated ?? 0;
  const { total_articles, total_athletes, published } = totals.results[0] ?? {};
  const waiting = queue.results[0]?.waiting ?? 0;

  const articleBreakdown = articles.results.length
    ? articles.results
        .map((r) => `${TYPE_LABELS[r.article_type] ?? r.article_type}: **${r.cnt}**`)
        .join("\n")
    : "Ingen artikler";

  const newAthletesLine =
    newAthletes > 0
      ? `**${newAthletes}** ny(e) atlet(er): ${(athletes.results[0]?.names ?? "").slice(0, 900)}`
      : "Ingen nye atleter";

  const conversionRate = storiesFound > 0 ? Math.round((storiesGenerated / storiesFound) * 100) : 0;

  const { pub_week, unedited_week, pending_suggestions } = learning.results[0] ?? {
    pub_week: 0,
    unedited_week: 0,
    pending_suggestions: 0,
  };
  const uneditedRate = pub_week > 0 ? Math.round((unedited_week / pub_week) * 100) : null;
  const learningLine =
    (uneditedRate !== null
      ? `**${uneditedRate}%** publiceret uredigeret (${unedited_week}/${pub_week})`
      : "Ingen publiceringer i ugen") +
    (reviewLine ? `\n${reviewLine}` : "") +
    (pending_suggestions > 0
      ? `\n✏️ ${pending_suggestions} stilforslag venter i admin → Stilguide`
      : "");

  return notify(
    {
      title: `📊 Ugentlig status — ${brand}`,
      color: COLOR.report,
      fields: [
        {
          name: "Artikler genereret (7 dage)",
          value: `**${newArticles}** total\n${articleBreakdown}`,
          inline: true,
        },
        {
          name: "Historier fundet → kladder",
          value: `${storiesFound} fundet → ${storiesGenerated} kladder (${conversionRate}%)`,
          inline: true,
        },
        { name: "Nye atleter", value: newAthletesLine, inline: false },
        { name: "Redigeringsgrad + review-beslutninger", value: learningLine, inline: false },
        {
          name: "Databasetotaler",
          value: `📝 ${total_articles ?? "?"} artikler (${published ?? "?"} live)\n🏈 ${total_athletes ?? "?"} aktive atleter`,
          inline: false,
        },
        {
          name: "Venter på dig",
          value:
            waiting > 0
              ? `**${waiting}** kladde(r) i køen → [åbn admin](${adminLink(country)})`
              : "Tom kladdekø",
          inline: false,
        },
      ],
    },
    country,
  );
}

async function main() {
  const db = createD1Client();
  // `--country=UK` sender kun ét lands rapport (til test); ellers alle.
  const only = process.argv.find((a) => a.startsWith("--country="))?.split("=")[1]?.toUpperCase();
  const countries = activeCountries()
    .map((c) => c.code)
    .filter((c) => !only || c === only);

  let sent = 0;
  for (const country of countries) {
    if (await digestFor(db, country)) sent++;
  }
  console.log(`Weekly digest sendt for ${sent}/${countries.length} land(e).`);
  // Ingen webhook overhovedet = en fejl værd at se i workflow-loggen.
  if (sent === 0) throw new Error("Ingen rapporter sendt — mangler DISCORD_WEBHOOK_URL?");
}

main().catch((err) => {
  console.error("Weekly digest fejlede:", err);
  process.exit(1);
});
