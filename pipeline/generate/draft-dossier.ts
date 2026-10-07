/**
 * Dossieret bag enhver kladde-pakke — atleten, kilden, faktaarket.
 * ===============================================================
 *
 * `draft-pack.ts` beder om en DOM, `fix-pack.ts` beder om en RETTELSE, men de
 * lægger det samme materiale på bordet først, og gjorde det med hver sin kopi:
 * samme SELECT (27 af 27 kolonner fælles), samme atlettabel, samme kildeblok,
 * samme faktaark — 31 byte-identiske linjer. To kopier af en prompt er værre
 * end to kopier af almindelig kode: de driver fra hinanden i det stille, og så
 * dømmes en kladde ud fra ét materiale og rettes ud fra et andet.
 *
 * Her ligger kun det der SKAL være ens. Hovedet og halen — hvad modellen bliver
 * bedt om, og hvad den skal svare — bliver liggende i hver sin fil, fordi det
 * er dér de to opgaver faktisk adskiller sig, og fordi de er tunet hver for sig.
 *
 * Rækkefølgen i `dossier()` er ikke til forhandling: KILDEN før kladden. Læser
 * man kladden først, læser man kilden efter hvad kladden påstår, og så ser man
 * ikke det der mangler — det var sådan #101 og #102 slap igennem.
 */

/** De felter begge pakker viser. Hver pakke udvider selv med sine egne. */
export interface DossierRow {
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
  previous_school: string | null;
  /** JSON array of the article's OTHER athletes (article_athletes), "[]" if none. */
  companions?: string | null;
  /**
   * JSON array of tournament day reports folded into this article
   * (stories.merged_into, migration 063), "[]" if none. Their facts are in the
   * draft, so their text is part of the source the review judges it against.
   */
  merged_sources?: string | null;
}

interface Companion {
  name: string | null;
  gender: string | null;
  class_year: string | null;
  expected_graduation: number | null;
  sport: string | null;
  position: string | null;
  university: string | null;
  hometown: string | null;
  previous_school: string | null;
}

/**
 * Kolonnerne dossieret hviler på. Ekstra kolonner sættes ind af kalderen med
 * `dossierSelect()`, så de to pakker ikke skal gentage listen for at tilføje én.
 */
const DOSSIER_COLUMNS = `a.id, a.title, a.content, a.country, a.article_type, s.source_url,
         s.fact_sheet, s.content_raw, s.summary,
         ath.name AS athlete_name, ath.gender, ath.class_year, ath.expected_graduation,
         ath.sport, ath.position, ath.university, ath.hometown, ath.previous_school,
         (SELECT json_group_array(json_object(
                   'name', c.name, 'gender', c.gender, 'class_year', c.class_year,
                   'expected_graduation', c.expected_graduation, 'sport', c.sport,
                   'position', c.position, 'university', c.university,
                   'hometown', c.hometown, 'previous_school', c.previous_school))
          FROM article_athletes aa JOIN athletes c ON c.id = aa.athlete_id
          WHERE aa.article_id = a.id AND aa.athlete_id != COALESCE(a.athlete_id, -1)) AS companions,
         (SELECT json_group_array(json_object(
                   'source_url', m.source_url, 'headline', m.headline,
                   'content_raw', m.content_raw, 'summary', m.summary))
          FROM stories m WHERE m.merged_into = a.id) AS merged_sources`;

const DOSSIER_FROM = `FROM articles a
  LEFT JOIN stories s ON s.id = a.story_id
  LEFT JOIN athletes ath ON ath.id = a.athlete_id`;

/**
 * Den nyeste gennemgang af en kladde, som en underforespørgsel.
 *
 * `reviewer` er 'mechanical' eller 'claude'. Kolonnen vælges frit, fordi de to
 * pakker har brug for hver sine felter — den mekaniske pakke kun `findings`,
 * rette-pakken også `verdict` og `content_hash`.
 */
export function latestReview(reviewer: string, column: string, alias: string): string {
  return `(SELECT dr.${column} FROM draft_reviews dr
           WHERE dr.article_id = a.id AND dr.reviewer = '${reviewer}'
           ORDER BY dr.id DESC LIMIT 1) AS ${alias}`;
}

/** Byg SELECT'en: dossierets kolonner plus kalderens egne. */
export function dossierSelect(extra: string[] = []): string {
  const cols = [DOSSIER_COLUMNS, ...extra].join(",\n         ");
  return `\n  SELECT ${cols}\n  ${DOSSIER_FROM}\n`;
}

/** JSON pænt nok til at læses af et menneske — og uændret hvis det ikke ER JSON. */
export function pretty(json: string | null): string {
  if (!json) return "(intet)";
  try {
    return JSON.stringify(JSON.parse(json), null, 1);
  } catch {
    return json;
  }
}

/**
 * Kildens tekst uden Sidearms tomme linjer og menu-rester.
 *
 * BEGGE felter kommer med, ikke `content_raw ?? summary` (2026-08-20). På
 * Sidearm-sider er `content_raw` tit sidens «Upcoming Event»-widget, mens
 * artiklens egen manchet ligger i `summary` fra feedet. Med fallback-logikken så
 * gennemgangen kun kampprogrammet — og dømte derfor rigtige, kildebelagte navne
 * (FAU's Roberts og Santos, kladde #111) som opdigtede. Et falsk «opdigtet» er
 * dyrere end lidt gentagelse: det sender en korrekt kladde retur.
 */
export function cleanSource(raw: string | null, summary: string | null): string {
  const tidy = (t: string | null): string =>
    (t ?? "")
      // Feed-manchetter starter tit med et <img>/<br>-hoved. Det er støj her.
      .replace(/<[^>]+>/g, " ")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join("\n")
      .trim();

  const feed = tidy(summary);
  const page = tidy(raw);
  // Er manchetten allerede indeholdt i sidens tekst, gentager vi den ikke.
  const both = page.includes(feed.slice(0, 120)) ? page : [feed, page].filter(Boolean).join("\n\n");
  return both.slice(0, 6000);
}

/**
 * Atleten, kilden og faktaarket — de tre blokke begge pakker viser ordret ens.
 *
 * Teksten er med vilje uændret fra den form begge prompts havde hver for sig
 * (bevist byte for byte mod gemte pakker, 2026-09-14). En prompt der er tunet
 * på rigtige kladder må ikke skifte ordlyd, fordi koden bag den bliver ryddet op.
 */
export function dossier(r: DossierRow): string {
  return `${additionNote(r.article_type)}${athleteTable(r)}${companionTables(r.companions)}
## Kilden (${r.source_url ?? "ukendt URL"})

\`\`\`
${cleanSource(r.content_raw, r.summary)}
\`\`\`
${mergedSources(r.merged_sources)}
## Faktaarket (det ENESTE kladden må hvile på)

\`\`\`json
${pretty(r.fact_sheet)}
\`\`\`
`;
}

/**
 * An ADDITION (src/lib/article-addition.ts) is 1-3 sentences that will be
 * appended to an existing match report — judge it as that, not as a thin
 * article. Empty for everything else, so other dossiers are unchanged.
 */
export function additionNote(articleType: string | null): string {
  if (articleType !== "addition") return "";
  return `## NB: Dette er en TILFØJELSE, ikke en artikel

Kladden er 1-3 sætninger, der føjes til en allerede skrevet kampartikel om samme atlet, når den udgives. Bedøm den som det: hver påstand skal stå i kilden nedenfor, men den skal IKKE fortælle kampen igen, have overskrift eller nå en artikels længde. Udvid den aldrig.

`;
}

/**
 * The tournament's earlier day reports, each as its own source block. Empty
 * when there are none, so every other dossier stays byte for byte as before.
 */
export function mergedSources(json: string | null | undefined): string {
  let list: Array<{ source_url: string | null; headline: string | null; content_raw: string | null; summary: string | null }> = [];
  try {
    list = JSON.parse(json ?? "[]");
  } catch {
    return "";
  }
  if (!Array.isArray(list)) return "";
  return list
    .map((m) => `
## Tidligere dagsrapport fra samme turnering (${m.source_url ?? "ukendt URL"})

\`\`\`
${cleanSource(m.content_raw, m.summary)}
\`\`\`
`)
    .join("");
}

function athleteTable(r: Omit<Companion, "name"> & { athlete_name: string | null }): string {
  return `## Atleten, som basen kender hende/ham

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
`;
}

/**
 * The article's other athletes (migration 058, 2026-09-28). Without them a
 * companion's hometown from our own records looked invented to the reviewer —
 * #409: Carter Ford "from London" was flagged as made up, and the base says
 * London, England. Empty for single-athlete articles, so their packs stay byte
 * for byte what the prompts were tuned on.
 */
function companionTables(json: string | null | undefined): string {
  let list: Companion[] = [];
  try {
    const parsed = JSON.parse(json ?? "[]");
    if (Array.isArray(parsed)) list = parsed;
  } catch {
    return "";
  }
  if (!list.length) return "";
  const tables = list
    .map((c) => athleteTable({ ...c, athlete_name: c.name }).replace(
      "## Atleten, som basen kender hende/ham",
      `### ${c.name ?? "(uden navn)"}`,
    ))
    .join("\n");
  return `
## Flere atleter i artiklen, som basen kender dem

Artiklen handler også om disse. Deres felter er basens viden på samme måde som
hovedatletens — en hjemby eller position herfra er IKKE opdigtet.

${tables}`;
}
