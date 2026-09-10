/**
 * Byg en RETTE-pakke pr. kladde — og find ud af hvilke kladder der skal rettes.
 * ===========================================================================
 *
 * `draft-pack.ts` beder om en DOM. Denne beder om en RETTELSE: samme kilde,
 * samme faktaark, samme atletdata — plus de fund gennemgangen allerede har
 * skrevet — og til sidst en instruks om at skrive kladden om, ikke om at
 * vurdere den igen.
 *
 * Rækkefølgen er den samme som i `draft-pack.ts` og valgt af samme grund:
 * KILDEN først, kladden SIDST. Retter man med kladden øverst i hovedet, retter
 * man formuleringer — ikke det der ikke står i kilden.
 *
 * Hvilke kladder (`--list` giver «id<TAB>verdict»):
 *   · upubliceret, og
 *   · har en Claude-gennemgang af PRÆCIS det indhold den har nu, og
 *   · den gennemgang siger `fix` eller `reject`, og
 *   · for `fix`: kladden er ikke allerede maskinrettet.
 *
 * Den sidste betingelse er spærren mod en løkke. En rettelse ændrer indholdet,
 * så hashen skifter, og næste nats gennemgang læser den rettede tekst — hvilket
 * er meningen. Men rettes den så igen, retter maskinen sin egen rettelse i
 * ring. Derfor: ÉN maskinrettelse pr. genereret kladde. Finder den næste
 * gennemgang stadig fejl, er de Mikkels — eller de er så grove at dommen bliver
 * `reject`, og så ryger kladden.
 *
 * Kør:
 *   npx tsx pipeline/generate/fix-pack.ts --list
 *   npx tsx pipeline/generate/fix-pack.ts --article 108
 */

import { createD1Client } from "../lib/d1-client";
import { countryProfile } from "../../src/lib/countries";
import { draftHash } from "./check-drafts";
import { cleanSource } from "./draft-pack";

export interface FixRow {
  id: number;
  title: string;
  content: string;
  art_summary: string | null;
  country: string | null;
  article_type: string | null;
  claude_fixed_content: string | null;
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
  previous_school: string | null;
  review_verdict: string | null;
  review_findings: string | null;
  review_summary: string | null;
  review_hash: string | null;
  mech_findings: string | null;
}

const SELECT = `
  SELECT a.id, a.title, a.content, a.summary AS art_summary, a.country, a.article_type,
         a.claude_fixed_content,
         s.source_url, s.fact_sheet, s.content_raw, s.summary,
         ath.name AS athlete_name, ath.gender, ath.class_year, ath.expected_graduation,
         ath.sport, ath.position, ath.university, ath.hometown, ath.previous_school,
         (SELECT dr.verdict      FROM draft_reviews dr
           WHERE dr.article_id = a.id AND dr.reviewer = 'claude'
           ORDER BY dr.id DESC LIMIT 1) AS review_verdict,
         (SELECT dr.findings     FROM draft_reviews dr
           WHERE dr.article_id = a.id AND dr.reviewer = 'claude'
           ORDER BY dr.id DESC LIMIT 1) AS review_findings,
         (SELECT dr.summary      FROM draft_reviews dr
           WHERE dr.article_id = a.id AND dr.reviewer = 'claude'
           ORDER BY dr.id DESC LIMIT 1) AS review_summary,
         (SELECT dr.content_hash FROM draft_reviews dr
           WHERE dr.article_id = a.id AND dr.reviewer = 'claude'
           ORDER BY dr.id DESC LIMIT 1) AS review_hash,
         (SELECT dr.findings     FROM draft_reviews dr
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

/** Er kladden allerede rettet af maskinen, i den form den står i nu? */
export function alreadyFixed(r: {
  content: string;
  claude_fixed_content: string | null;
}): boolean {
  return r.claude_fixed_content !== null && r.claude_fixed_content === r.content;
}

/** Hvad natkørslen skal gøre med kladden — null = ingenting. */
export function actionFor(r: FixRow): "fix" | "reject" | null {
  // Gennemgangen skal handle om DETTE indhold. Ellers er kladden ulæst, og
  // gennemgangen kører først.
  if (!r.review_hash || r.review_hash !== draftHash(r.title, r.content)) return null;
  if (r.review_verdict === "reject") return "reject";
  if (r.review_verdict === "fix") return alreadyFixed(r) ? null : "fix";
  return null;
}

export function buildFixPack(r: FixRow): string {
  const profile = countryProfile(r.country ?? undefined);
  const lang = profile.language === "en" ? "engelsk" : "dansk";
  const sprogregel =
    lang === "dansk" ? "Skriv dansk med æ, ø og å" : "Skriv engelsk";
  return `# Ret kladde #${r.id}

Du er redaktør på et medie om ${lang}e college-atleter i USA. Kladden nedenfor er
skrevet af en gratis sprogmodel, og en gennemgang har allerede fundet fejlene.
Din opgave er ikke at dømme den igen — den er at SKRIVE DEN OM, så hver sætning
der bliver stående, kan bæres af kilden eller faktaarket.

**Læs kilden før kladden.** Læser du kladden først, retter du formuleringer i
stedet for påstande.

## Fire regler for rettelsen

1. **Intet nyt.** Du må ikke tilføje en oplysning der ikke står i kilden eller
   faktaarket — heller ikke en der lyder oplagt. Ingen citater, ingen
   holdninger, ingen stadionnavne, ingen trænerudtalelser.
2. **Skær, hvor du ikke kan rette.** Kan en påstand ikke belægges, skal den ud —
   ikke erstattes af en anden påstand. En kortere, sand artikel er det rigtige
   svar. Er materialet tyndt, bliver teksten kort; det er i orden.
3. **Rør kun det der er noget i vejen med.** Sætninger uden fund skal stå som de
   står. Rettelsen skal kunne læses som et diff, ikke som en ny artikel.
4. **${sprogregel}**, nøgternt, uden floskler ("markerer et vigtigt skridt",
   "fuld tillid fra trænerstaben") og uden tillagte følelser.

Kan kladden **ikke** rettes inden for reglerne — er den om den forkerte person,
om en kamp der ikke er spillet, eller er så meget opdigtet at der ikke er en
artikel tilbage — så svar "verdict": "reject" og lad "content" stå tom. Det er
et rigtigt svar, ikke en fiasko.

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
| Forrige skole | ${r.previous_school ?? "ingen registreret (siger IKKE at der ikke er en)"} |

## Kilden (${r.source_url ?? "ukendt URL"})

\`\`\`
${cleanSource(r.content_raw, r.summary)}
\`\`\`

## Faktaarket (det ENESTE kladden må hvile på)

\`\`\`json
${pretty(r.fact_sheet)}
\`\`\`

## Fundene der skal rettes

Gennemgangens dom: **${r.review_verdict ?? "?"}** — ${r.review_summary ?? ""}

\`\`\`json
${pretty(r.review_findings)}
\`\`\`

Mekaniske fund (samme kladde, maskinelt tjek):

\`\`\`json
${pretty(r.mech_findings)}
\`\`\`

Et fund kan være forkert. Står påstanden i kilden, skal du IKKE rette den væk —
skriv den i stedet i \`disagreed\` med hvor i kilden den står.

## Kladden, som den ser ud nu

Titel: **${r.title}**

Manchet: ${r.art_summary ?? "(ingen)"}

\`\`\`
${r.content}
\`\`\`

## Hvad du skal svare

Svar KUN med JSON, intet andet. \`content\` er den fulde rettede artikeltekst
(samme format som kladden: brødtekst med de mellemrubrikker der skal blive
stående), ikke et diff.

\`\`\`json
{
  "verdict": "fix" | "reject",
  "title": "titlen, rettet hvis den var forkert",
  "summary": "manchetten, rettet hvis den var forkert",
  "content": "hele den rettede artikel",
  "note": "én sætning om hvad rettelsen gjorde",
  "changes": [
    { "was": "det der stod", "now": "det der står nu (tom hvis slettet)", "why": "hvorfor" }
  ],
  "unfixable": ["fund du ikke kunne rette, og hvorfor"],
  "disagreed": ["fund du mener er forkerte, med belæg fra kilden"]
}
\`\`\`
`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const db = createD1Client();

  if (argv.includes("--list")) {
    const rows = await db.query<FixRow>(`${SELECT} WHERE a.published = 0 ORDER BY a.id`);
    for (const r of rows.results) {
      const action = actionFor(r);
      if (action) console.log(`${r.id}\t${action}`);
    }
    return;
  }

  const i = argv.indexOf("--article");
  const id = i >= 0 ? parseInt(argv[i + 1] ?? "", 10) : NaN;
  if (Number.isNaN(id)) {
    console.error("Brug: --article <id> eller --list");
    process.exit(1);
  }
  const rows = await db.query<FixRow>(`${SELECT} WHERE a.id = ?`, [id]);
  const row = rows.results[0];
  if (!row) {
    console.error(`Kladde #${id} findes ikke.`);
    process.exit(1);
  }
  console.log(buildFixPack(row));
}

if (process.argv[1] && /fix-pack\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Rette-pakke fejlede:", err);
    process.exit(1);
  });
}
