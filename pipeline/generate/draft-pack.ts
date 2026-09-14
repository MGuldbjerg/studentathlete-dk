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
 * Selve dossieret (atlet, kilde, faktaark) ligger i `draft-dossier.ts`, fordi
 * `fix-pack.ts` viser præcis det samme materiale. Her bliver kun det liggende
 * der er særligt for en GENNEMGANG: opgaven, de mekaniske fund og svarformen.
 *
 * Kør:
 *   npx tsx pipeline/generate/draft-pack.ts --list             # id'er der mangler gennemgang
 *   npx tsx pipeline/generate/draft-pack.ts --article 108      # pakken på stdout
 */

import { createD1Client } from "../lib/d1-client";
import { countryProfile } from "../../src/lib/countries";
import { draftHash } from "./check-drafts";
import { dossier, dossierSelect, latestReview, pretty, type DossierRow } from "./draft-dossier";

interface Row extends DossierRow {
  mech_summary: string | null;
  mech_findings: string | null;
}

const SELECT = dossierSelect([
  latestReview("mechanical", "summary", "mech_summary"),
  latestReview("mechanical", "findings", "mech_findings"),
]);

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

${dossier(r)}
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
4. **Årgang** — fremskrives en sæson for en atlet der dimitterer? Bemærk: årgang
   siger INTET om, hvor længe atleten har været på skolen. Transfers er
   almindelige, så en junior kan sagtens have debut for holdet. En debut-påstand
   kræver kilden — men den kan ikke afvises med årgangen alene.
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

/**
 * Kladder uden en Claude-gennemgang af NETOP dette indhold.
 *
 * To forespørgsler, ikke én pr. kladde. Den gamle form hentede kladderne og
 * spurgte så basen én gang FOR HVER kladde om den var gennemgået — 12 kald for
 * 11 kladder, fem gange om dagen, over Cloudflares REST-API. Hashen kan ikke
 * regnes i SQL, så parringen sker her; men rækkerne kan hentes på én gang.
 *
 * Bemærk «en hvilken som helst» gennemgang af teksten, ikke den nyeste:
 * spørgsmålet er om DENNE tekst er læst før, så en kladde der bliver redigeret
 * og fortrudt ikke skal gennemgås igen. `fix-pack.ts` spørger med vilje om den
 * NYESTE — dér er spørgsmålet hvad dommen over teksten er lige nu.
 */
export async function unreviewedDrafts(
  db: ReturnType<typeof createD1Client>,
): Promise<number[]> {
  const drafts = await db.query<{ id: number; title: string; content: string }>(
    `SELECT id, title, content FROM articles WHERE published = 0 ORDER BY id`,
  );
  const seen = await db.query<{ article_id: number; content_hash: string }>(
    `SELECT dr.article_id, dr.content_hash
       FROM draft_reviews dr
       JOIN articles a ON a.id = dr.article_id
      WHERE dr.reviewer = 'claude' AND a.published = 0`,
  );
  const reviewed = new Set(seen.results.map((r) => `${r.article_id}:${r.content_hash}`));
  return drafts.results
    .filter((r) => !reviewed.has(`${r.id}:${draftHash(r.title, r.content)}`))
    .map((r) => r.id);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const db = createD1Client();

  if (argv.includes("--list")) {
    console.log((await unreviewedDrafts(db)).join("\n"));
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
