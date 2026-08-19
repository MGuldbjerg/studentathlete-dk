/**
 * Discord-ping med Claudes gennemgange af kladder (pr. land).
 *
 * Sender KUN når der er noget at fortælle: en gennemgang fra i dag med mindst ét
 * fund. Uden den regel ville en tom kø give en besked hver tredje time, og så
 * bliver kanalen støj — samme lære som «stories er ikke dashboard-elementer»
 * (2026-06-04).
 */

import { createD1Client } from "../lib/d1-client";
import { notify, adminLink } from "../lib/notify";

interface Row {
  article_id: number;
  title: string;
  country: string | null;
  verdict: string;
  severity: string | null;
  summary: string | null;
  findings: string | null;
}

async function main(): Promise<void> {
  const db = createD1Client();
  const rows = await db.query<Row>(
    `SELECT dr.article_id, a.title, a.country, dr.verdict, dr.severity, dr.summary, dr.findings
     FROM draft_reviews dr
     JOIN articles a ON a.id = dr.article_id
     WHERE dr.reviewer = 'claude'
       AND a.published = 0
       AND dr.created_at > datetime('now', '-6 hours')
       AND dr.verdict != 'ok'
     ORDER BY dr.article_id`,
  );

  if (rows.results.length === 0) {
    console.log("Ingen nye gennemgange at pinge om.");
    return;
  }

  const byCountry = new Map<string, Row[]>();
  for (const r of rows.results) {
    const c = r.country ?? "DK";
    byCountry.set(c, [...(byCountry.get(c) ?? []), r]);
  }

  for (const [country, items] of byCountry) {
    const worst = items.some((i) => i.verdict === "reject") ? "reject" : "fix";
    const body = items
      .map((i) => {
        const n = (() => {
          try {
            return Array.isArray(JSON.parse(i.findings ?? "[]")) ? JSON.parse(i.findings!).length : 0;
          } catch {
            return 0;
          }
        })();
        return `**#${i.article_id}** ${i.title}\n${i.verdict.toUpperCase()} · ${n} fund — ${i.summary ?? ""}`;
      })
      .join("\n\n")
      .slice(0, 3600);

    await notify(
      {
        title:
          worst === "reject"
            ? `🛑 ${items.length} kladde(r) bør AFVISES`
            : `✏️ ${items.length} kladde(r) skal rettes før publicering`,
        description: `${body}\n\n[Åbn kladdekøen](${adminLink(country, "/admin")})`,
        color: worst === "reject" ? 15158332 : 15844367,
      },
      country,
    );
    console.log(`  Discord (${country}): ${items.length} kladde(r).`);
  }
}

if (process.argv[1] && /notify-reviews\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Ping fejlede:", err);
    process.exit(1);
  });
}
