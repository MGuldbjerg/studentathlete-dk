/**
 * Byg en gennemgangs-pakke pr. kladde — alt et menneske (eller Claude) skal se.
 * ===========================================================================
 *
 * Formålet er at gøre gennemgangen billig og ensartet: én markdown-fil der
 * indeholder kilden, faktaarket, atletens data fra basen, de mekaniske fund og
 * selve kladden — og til sidst hvad der skal svares tilbage. Uden pakken skal
 * hver gennemgang selv finde de fem ting frem, og så bliver de ikke fundet.
 *
 * Rækkefølgen er valgt: KILDEN først, kladden SIDST. Læser man kladden først,
 * læser man kilden efter hvad kladden påstår — og så finder man ikke det der
 * mangler. Det var netop sådan #101 og #102 slap igennem: de lød rigtige.
 *
 * Kør:
 *   npx tsx pipeline/generate/draft-pack.ts --list             # id'er der mangler gennemgang
 *   npx tsx pipeline/generate/draft-pack.ts --article 108      # pakken på stdout
 */

import { createD1Client } from "../lib/d1-client";
import { countryProfile } from "../../src/lib/countries";
import { draftHash } from "./check-drafts";

interface Row {
  id: number;
  title: string;
  content: string;
  country: string | null;
  article_type: string | null;
  source_url: string | null;
  fact_sheet: string | null;
  content_raw: string | null;
  summary: string | null;
  athlete_name: string | null;
  gender: string | null;
  class_year: string | null;
  expected_graduation: number | null;
  sport: string | null;
  position: string | null;
  university: string | null;
  hometown: string | null;
  mech_summary: string | null;
  mech_findings: string | null;
}

const SELECT = `
  SELECT a.id, a.title, a.content, a.country, a.article_type, s.source_url,
         s.fact_sheet, s.content_raw, s.summary,
         ath.name AS athlete_name, ath.gender, ath.class_year, ath.expected_graduation,
         ath.sport, ath.position, ath.university, ath.hometown,
         (SELECT dr.summary FROM draft_reviews dr
           WHERE dr.article_id = a.id AND dr.reviewer = 'mechanical'
           ORDER BY dr.id DESC LIMIT 1) AS mech_summary,
         (SELECT dr.findings FROM draft_reviews dr
           WHERE dr.article_id = a.id AND dr.reviewer = 'mechanical'
           ORDER BY dr.id DESC LIMIT 1) AS mech_findings
  FROM articles a
  LEFT JOIN stories s ON s.id = a.story_id
  LEFT JOIN athletes ath ON ath.id = a.athlete_id
`;

function pretty(json: string | null): string {
  if (!json) return "(intet)";
  try {
    return JSON.stringify(JSON.parse(json), null, 1);
  } catch {
    return json;
  }
}

/** Kildens tekst uden Sidearms tomme linjer og menu-rester. */
function cleanSource(raw: string | null, fallback: string | null): string {
  const text = raw ?? fallback ?? "";
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n")
    .slice(0, 6000);
}

export function buildPack(r: Row): string {
  const lang = countryProfile(r.country ?? undefined).language === "en" ? "engelsk" : "dansk";
  const mech = r.mech_findings ? pretty(r.mech_findings) : "(ikke kørt)";
  return `# Gennemgang af kladde #${r.id}

Du er redaktør på et medie om ${lang}e college-atleter i USA. Kladden nedenfor er
skrevet af en gratis sprogmodel ud fra faktaarket. Din opgave er at finde det der
IKKE holder — ikke at rose det der gør.

**Læs kilden før kladden.** Læser du kladden først, læser du kilden efter hvad
kladden påstår, og så ser du ikke det der mangler. To kladder om HELT forkerte
mennesker (#101, #102) slap igennem netop fordi de lød rigtige.

## Atleten, som basen kender hende/ham

| Felt | Værdi |
|---|---|
| Navn | ${r.athlete_name ?? "(ingen kobling)"} |
| Køn i basen | ${r.gender ?? "ukendt"} |
| Årgang | ${r.class_year ?? "ukendt"} |
| Forventet dimission | ${r.expected_graduation ?? "ukendt"} |
| Sport | ${r.sport ?? "?"} |
| Position | ${r.position ?? "?"} |
| Universitet | ${r.university ?? "?"} |
| Hjemby | ${r.hometown ?? "?"} |

## Kilden (${r.source_url ?? "ukendt URL"})

\`\`\`
${cleanSource(r.content_raw, r.summary)}
\`\`\`

## Faktaarket (det ENESTE kladden må hvile på)

\`\`\`json
${pretty(r.fact_sheet)}
\`\`\`

## Mekaniske fund (allerede tjekket — du behøver ikke gentage dem)

\`\`\`json
${mech}
\`\`\`

## Kladden

Titel: **${r.title}**

\`\`\`
${r.content}
\`\`\`

## Hvad du skal svare

Tjek især:
1. **Identitet** — handler kilden om DENNE atlet? Er alle personer i kladden
   virkelige og navngivet i kilden?
2. **Belæg** — står hver påstand (tal, hæder, rolle, holdtilhør) i faktaarket
   eller kilden? Alt andet er opdigtet, også når det lyder plausibelt.
3. **Tid** — er begivenheden overstået? Ingen datid om noget der ikke er sket.
4. **Årgang** — fremskrives en sæson for en atlet der dimitterer?
5. **Sprog** — ${lang}, nøgternt, ingen floskler ("markerer et vigtigt skridt",
   "fuld tillid fra trænerstaben"), ingen tillagte holdninger.

Svar KUN med JSON, intet andet:

\`\`\`json
{
  "verdict": "ok" | "fix" | "reject",
  "summary": "én sætning til Discord",
  "findings": [
    { "severity": "high" | "medium", "category": "identity|facts|timing|class_year|language|other",
      "claim": "det konkrete i kladden", "why": "hvorfor det ikke holder" }
  ]
}
\`\`\`

`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const db = createD1Client();

  if (argv.includes("--list")) {
    // Kladder uden en Claude-gennemgang af NETOP dette indhold.
    const rows = await db.query<{ id: number; title: string; content: string }>(
      `SELECT id, title, content FROM articles WHERE published = 0 ORDER BY id`,
    );
    const out: number[] = [];
    for (const r of rows.results) {
      const hash = draftHash(r.title, r.content);
      const seen = await db.query<{ n: number }>(
        `SELECT COUNT(*) n FROM draft_reviews
         WHERE article_id = ? AND reviewer = 'claude' AND content_hash = ?`,
        [r.id, hash],
      );
      if ((seen.results[0]?.n ?? 0) === 0) out.push(r.id);
    }
    console.log(out.join("\n"));
    return;
  }

  const i = argv.indexOf("--article");
  const id = i >= 0 ? parseInt(argv[i + 1] ?? "", 10) : NaN;
  if (Number.isNaN(id)) {
    console.error("Brug: --article <id> eller --list");
    process.exit(1);
  }
  const rows = await db.query<Row>(`${SELECT} WHERE a.id = ?`, [id]);
  const row = rows.results[0];
  if (!row) {
    console.error(`Kladde #${id} findes ikke.`);
    process.exit(1);
  }
  console.log(buildPack(row));
}

if (process.argv[1] && /draft-pack\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Pakke-bygning fejlede:", err);
    process.exit(1);
  });
}
