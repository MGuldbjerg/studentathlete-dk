import { createD1Client } from "../lib/d1-client.ts";

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
if (!WEBHOOK) throw new Error("Mangler DISCORD_WEBHOOK_URL");

const db = createD1Client();

const [articles, athletes, stories, totals] = await Promise.all([
  db.query<{ article_type: string; cnt: number }>(`
    SELECT article_type, COUNT(*) as cnt
    FROM articles
    WHERE datetime(created_at) >= datetime('now', '-7 days')
    GROUP BY article_type
    ORDER BY cnt DESC
  `),
  db.query<{ cnt: number; names: string }>(`
    SELECT COUNT(*) as cnt,
           GROUP_CONCAT(name, ', ') as names
    FROM athletes
    WHERE datetime(created_at) >= datetime('now', '-7 days')
  `),
  db.query<{ found: number; generated: number }>(`
    SELECT
      COUNT(*) as found,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as generated
    FROM stories
    WHERE datetime(created_at) >= datetime('now', '-7 days')
  `),
  db.query<{ total_articles: number; total_athletes: number; published: number }>(`
    SELECT
      (SELECT COUNT(*) FROM articles) as total_articles,
      (SELECT COUNT(*) FROM athletes WHERE active = 1) as total_athletes,
      (SELECT COUNT(*) FROM articles WHERE published = 1) as published
  `),
]);

const TYPE_LABELS: Record<string, string> = {
  news: "Nyheder",
  feature: "Features",
  "season-update": "Sæsonopdateringer",
  recruiting: "Rekruttering",
};

const newArticles = articles.results.reduce((s, r) => s + r.cnt, 0);
const newAthletes = athletes.results[0]?.cnt ?? 0;
const storiesFound = stories.results[0]?.found ?? 0;
const storiesGenerated = stories.results[0]?.generated ?? 0;
const { total_articles, total_athletes, published } = totals.results[0] ?? {};

const articleBreakdown = articles.results.length
  ? articles.results.map((r) => `${TYPE_LABELS[r.article_type] ?? r.article_type}: **${r.cnt}**`).join("\n")
  : "Ingen artikler";

const newAthletesLine =
  newAthletes > 0
    ? `**${newAthletes}** ny(e) atlet(er): ${athletes.results[0]?.names ?? ""}`
    : "Ingen nye atleter";

const conversionRate =
  storiesFound > 0 ? Math.round((storiesGenerated / storiesFound) * 100) : 0;

const embed = {
  title: "📊 Ugentlig StatusOpdatering — StudentAthlete.dk",
  color: 5793266,
  fields: [
    {
      name: "Artikler genereret (7 dage)",
      value: `**${newArticles}** total\n${articleBreakdown}`,
      inline: true,
    },
    {
      name: "Historier fundet → udgivet",
      value: `${storiesFound} fundet → ${storiesGenerated} udgivet (${conversionRate}%)`,
      inline: true,
    },
    {
      name: "Nye atleter",
      value: newAthletesLine,
      inline: false,
    },
    {
      name: "Database totaler",
      value: `📝 ${total_articles ?? "?"} artikler (${published ?? "?"} live)\n🏈 ${total_athletes ?? "?"} aktive atleter`,
      inline: false,
    },
  ],
  footer: { text: "StudentAthlete.dk — ugentlig rapport" },
  timestamp: new Date().toISOString(),
};

const res = await fetch(WEBHOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ embeds: [embed] }),
});

if (!res.ok) {
  throw new Error(`Discord webhook fejlede: ${res.status} ${await res.text()}`);
}

console.log("Weekly digest sendt til Discord.");
