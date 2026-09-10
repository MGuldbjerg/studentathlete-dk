/**
 * TAL I DEN FORKERTE ROLLE — det tjekket for «tal uden kilde» ikke kan se.
 * =======================================================================
 *
 * `fact-numbers.ts` spørger ét spørgsmål: STÅR tallet i kilden? Det fanger
 * opdigtede tal, og det har det gjort godt. Men de to farligste fejl i køen
 * 2026-09-08 slap begge forbi, fordi de bestod netop den prøve:
 *
 *   #237  «instrumental in the 3-1 victory over the Huskies»
 *         3-1 er Holy Cross' SÆSONREKORD — «Holy Cross (3-1) will return
 *         home» — og kampens score står ingen steder. Tallene 3 og 1 er i
 *         kilden, så taltjekket tav. Kladden var oven i købet mekanisk ren:
 *         `fabrication_risk` = low, nul flag.
 *
 *   #237  «the four assists provided by MacLean lead the Patriot League»
 *         Kilden siger «MacLean's five assists leads the Patriot League».
 *         De fire er weekendens, de fem er sæsonens. Begge tal står i
 *         kilden — kladden har byttet om på hvilket der bærer hæderen.
 *
 * Og den hyppigste fejl i køen 2026-09-04, 11 kladder ud af 26:
 *
 *   «season opener» om en kamp midt i sæsonen. Rekordstrengen står altid
 *   lige ved siden af scoren: er holdet 3-1, har det spillet fire kampe.
 *
 * Alle tre er den SAMME fejl: et tal der findes i kilden, læst i en rolle
 * kilden ikke giver det. Rekordstrengen er den mest misforståede streng vi
 * har — den ligner en score, og den ligger altid tæt på en.
 *
 * Reglen er derfor: et fund kræver en KONFLIKT vi kan påvise, ikke et
 * fravær vi kan formode. Står talparret slet ikke i kilden, siger denne fil
 * ingenting — det er taltjekkets arbejde. Fravær er tvetydigt, og en falsk
 * alarm lærer redaktøren at ignorere listen (samme afvejning som i
 * `fact-numbers.ts`).
 */

/** Skrevne grundtal. Kilder og kladder skriver «four assists», ikke «4». */
const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  en: 1, et: 1, to: 2, tre: 3, fire: 4, fem: 5, seks: 6, syv: 7, otte: 8,
  ni: 9, ti: 10, elleve: 11, tolv: 12,
};

/**
 * Tællelige størrelser. Listen er bevidst KORT: kun størrelser en liga faktisk
 * rangerer folk på. Jo bredere listen er, jo flere tilfældige sammenfald — og
 * regel 2 sammenligner kun når kilden selv har en rangerings-sætning om samme
 * størrelse, så en manglende gren koster et manglende fund, ikke en fejl.
 */
const STAT_NOUNS = [
  "assists", "goals", "points", "saves", "shots", "tackles", "kills", "digs",
  "blocks", "rebounds", "aces", "wins", "victories", "appearances", "starts",
  "minutes", "yards", "touchdowns", "strikeouts", "runs", "hits", "medals",
  "clean sheets", "shutouts",
  // dansk
  "assister", "mål", "point", "redninger", "skud", "tacklinger", "kampe",
  "minutter", "sejre", "scoringer",
];

/**
 * Rangering — og hvorfor det skal være en LIGA-placering.
 *
 * Første udgave tog ethvert «led/top/most». Kørt mod arkivet gav den fire
 * falske alarmer ud af seks: «Bassett led Rogers State with two shots» blev
 * målt mod kildens «two shots» for en anden spiller, og «Trent Murphy made
 * six saves» mod modstanderens målmand. Ordet «led» er dagligsprog i et
 * kampreferat.
 *
 * Fejlen vi FAKTISK har set er snævrere: en placering i en liga, båret af det
 * forkerte tal (#237, fire mod fem assists). Den kræver både et
 * rangerings-verbum og en liga — og at sætningen handler om atleten selv.
 */
const RANK_CUES = /\b(lead|leads|leading|tops|topped|rank|ranks|ranked|fører|førende|flest)\b/i;
const STANDINGS_CUES =
  /\b(league|conference|nation|nationally|division|standings|ncaa|country|ligaen|konferencen|landet)\b/i;

/** Et resultat er faldet: kampen er ovre, og tallet er slutstillingen. */
const FINAL_CUES =
  /\b(won|win|wins|victory|victories|beat|beats|beaten|defeat|defeats|defeated|defeating|lost|loss|losses|final|rout|routed|tops|topping|topped|downed|edged|drew|draw|tie|tied|shutout|upset|vandt|sejr|sejren|tabte|nederlag|slog|besejrede|uafgjort|resultatet)\b/i;

/**
 * Undervejs i kampen. «led 2-1 at half-time» er en mellemstilling, ikke en
 * påstand om slutresultatet — og den må ikke måles mod `final_score`.
 * Uden den her ville hver eneste kampreferat med en halvlegsstilling blive
 * flaget; husets egne udgivne artikler er fulde af dem.
 */
const INTERIM_CUES =
  /\b(half-?time|at the break|interval|lead|leads|leading|led|trail|trails|trailing|trailed|ahead|behind|in front|pulled|reduce[ds]?|equalis\w+|equaliz\w+|level\w*|made it|going into|after the first|after the second|at the end of|førte|føring|bagud|pausen|halvleg|reducerede|udlignede)\b/i;

/** Rekord-strengen: «(3-1)», «improves to 2-0», «now 4-1 overall». */
const RECORD_CUES = /\b(record|improves?|improved|falls?|fell|drops?|dropped|moves?|moved|advances?|advanced|climbs?|now|overall|rekord|står nu)\b/i;

/** «Sæsonpremiere» — den påstand rekorden kan modbevise. */
const OPENER_CUES =
  /\b(season opener|season-opening|season opening|opening match|opening game|opening fixture|first match of the season|first game of the season|season debut|opened (?:their|its|her|his) season|open (?:their|its|her|his) season|sæsonpremiere|sæsonåbner|sæsonens første kamp|første kamp i sæsonen|åbnede sæsonen)\b/i;

/**
 * En sætning der omtaler en ANDEN, tidligere kamp.
 *
 * Kladden må gerne skrive «sejren følger et 1-0-nederlag til Cornell i
 * sæsonpremieren» — det er korrekt, og rekorden modsiger det ikke. Uden den
 * her undtagelse flagede tjekket tre sådanne sætninger, to af dem i UDGIVNE
 * artikler.
 *
 * FORBEHOLD: listen er kalibreret på de tre tilfælde arkivet indeholder
 * (#192, #194, #214). Den skal vokse med nye ægte eksempler, ikke med gæt —
 * hvert ord her er et fund vi giver afkald på.
 */
const PRIOR_MATCH_CUES =
  /\b(follows?|followed|following|earlier|previous|previously|prior|last (?:week|weekend|time|match|game|outing)|building on|tidligere|forrige|i sidste uge|efter uafgjort|havde spillet)\b/i;

export interface RoleFinding {
  kind: "score_is_record" | "score_conflict" | "rank_number" | "opener_vs_record";
  claim: string;
  why: string;
}

export interface RoleInput {
  title: string;
  content: string;
  /** Faktaarkets rå JSON (`stories.fact_sheet`). */
  factSheet: string | null;
  /** Kildens tekst (`stories.content_raw` ?? `summary` ?? `headline`). */
  sourceText: string | null;
  /** Atletens navn og evt. kaldenavn — regel 2 sammenligner kun HENDES tal. */
  athleteNames?: Array<string | null | undefined>;
}

interface PairHit {
  /** Normaliseret «3-1» (uden et evt. tredje led). */
  pair: string;
  /** Alle led, så antal spillede kampe kan lægges sammen. */
  parts: number[];
  role: "record" | "final" | "interim" | "bare";
  /** Sætningen tallet står i — bruges i fundets tekst. */
  context: string;
}

/**
 * Bindestreger, alle de former en kilde og en model bruger: almindelig,
 * hårdt mellemrum (U+2010/U+2011) og tankestreg (U+2013/U+2014).
 *
 * Kladde #237 skrev «3‑1» med U+2011. Med kun den almindelige bindestreg i
 * mønstret så tjekket slet ikke talparret — og en score der ikke bliver læst,
 * bliver heller ikke sammenlignet med rekorden. Den fejl er tavs, og derfor
 * den værste slags.
 */
const DASHES = "\\u002d\\u2010\\u2011\\u2013\\u2014";
const PAIR_RE = new RegExp(
  `(?<![\\d${DASHES}:.])(\\d{1,3})[${DASHES}](\\d{1,3})(?:[${DASHES}](\\d{1,3}))?(?![\\d${DASHES}:.])`,
  "g",
);

/**
 * Rollen for ét talpar, læst af ordene omkring det.
 *
 * Rækkefølgen er ikke tilfældig. «falls to» er BÅDE et rekord-signal («falls
 * to 3-1») og et resultat-signal («fell to Duke 3-1»). Forskellen er om
 * parret står lige efter «to» — derfor afgøres rekord først.
 */
export function classifyPair(before: string, after: string, threeParts: boolean): PairHit["role"] {
  const b = before.slice(-60);
  const a = after.slice(0, 40);

  // Tre led (2-2-0) er sejre-nederlag-uafgjorte. Det er en rekord, ikke en score.
  if (threeParts) return "record";
  // «(3-1)» og «(3-1, 0-0 America East)».
  if (/[(\[]\s*$/.test(b) && /^\s*[,)\]]/.test(a)) return "record";
  // «improves to 3-1», «now 3-1», «is 3-1 overall».
  if (/\b(to|now|at)\s*$/.test(b) && RECORD_CUES.test(b)) return "record";
  if (/^\s*(overall|on the season|in league play|in conference)/i.test(a)) return "record";

  if (INTERIM_CUES.test(b) || INTERIM_CUES.test(a)) return "interim";
  if (FINAL_CUES.test(b) || FINAL_CUES.test(a)) return "final";
  return "bare";
}

/** Sætningen omkring et sted i teksten — til fundets `claim`. */
function sentenceAround(text: string, index: number): string {
  const start = Math.max(0, text.lastIndexOf(".", index - 1) + 1, text.lastIndexOf("\n", index) + 1);
  let end = text.length;
  for (const p of [".", "\n"]) {
    const i = text.indexOf(p, index);
    if (i >= 0 && i < end) end = i;
  }
  return text.slice(start, end + 1).trim().replace(/\s+/g, " ");
}

/** Alle talpar i en tekst, med rolle. */
export function pairsIn(text: string): PairHit[] {
  const out: PairHit[] = [];
  for (const m of text.matchAll(PAIR_RE)) {
    const i = m.index ?? 0;
    const parts = [m[1], m[2], m[3]].filter((p): p is string => p !== undefined).map(Number);
    out.push({
      // Tre led er en rekord og må ALDRIG kunne matche en toleddet score:
      // «(1-0-1, 0-0-0)» fik ellers en ægte 0-0-kamp til at ligne en rekord.
      pair: m[3] !== undefined ? `${m[1]}-${m[2]}-${m[3]}` : `${m[1]}-${m[2]}`,
      parts,
      role: classifyPair(text.slice(0, i), text.slice(i + m[0].length), m[3] !== undefined),
      context: sentenceAround(text, i),
    });
  }
  return out;
}

/** «9-1», «9–1», « 9 - 1 » → «9-1». */
function normalisePair(s: string): string {
  const m = new RegExp(`(\\d{1,3})\\s*[${DASHES}]\\s*(\\d{1,3})`).exec(s);
  return m ? `${m[1]}-${m[2]}` : "";
}

interface FactSheetShape {
  result?: { final_score?: string | null } | null;
  event?: { opponent?: string | null } | null;
}

function factsOf(factSheet: string | null): { finalScore: string; opponent: string } {
  if (!factSheet) return { finalScore: "", opponent: "" };
  try {
    const fs = JSON.parse(factSheet) as FactSheetShape;
    return {
      finalScore: normalisePair(fs.result?.final_score ?? ""),
      opponent: (fs.event?.opponent ?? "").trim(),
    };
  } catch {
    return { finalScore: "", opponent: "" };
  }
}

/** Sætninger — punktum, linjeskift og de tabelagtige linjer kilder har. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Rangerings-påstande i en tekst: størrelse → de tal der bærer hæderen.
 *
 * Tallet skal stå LIGE FØR størrelsen («five assists», «hendes ni point»),
 * højst tre ord fra. Det udelukker «ranks fourth», hvor 4 hører til
 * placeringen og ikke til assists.
 */
export function rankClaims(text: string, athlete: string[]): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  for (const s of sentences(text)) {
    if (!RANK_CUES.test(s) || !STANDINGS_CUES.test(s)) continue;
    const lower = s.toLowerCase();
    // Sætningen skal handle om atleten. Uden det her sammenlignes to
    // forskellige menneskers tal, fordi de deler størrelse.
    if (!athlete.some((a) => a && lower.includes(a))) continue;
    for (const noun of STAT_NOUNS) {
      let from = 0;
      for (;;) {
        const at = lower.indexOf(noun, from);
        if (at < 0) break;
        from = at + noun.length;
        // Kun hele ord: «goals» må ikke matche inde i «goalscorers».
        if (/[a-zæøå]/.test(lower[at - 1] ?? "") || /[a-zæøå]/.test(lower[at + noun.length] ?? "")) continue;
        const n = countBefore(lower.slice(0, at));
        if (n === null) continue;
        const set = out.get(noun) ?? new Set<number>();
        set.add(n);
        out.set(noun, set);
      }
    }
  }
  return out;
}

/**
 * Tallet der TÆLLER størrelsen umiddelbart efter — «five assists», «hendes ni
 * point». Højst ét ord imellem, så «ranks fourth in assists» ikke giver 4.
 *
 * Et tal i et talpar tælles ikke med. «a 9-7 edge in shots» blev ellers læst
 * som 97 skud, fordi bindestregen forsvandt i ordopdelingen — tre af de fire
 * falske alarmer i første kørsel var netop den.
 */
export function countBefore(prefix: string): number | null {
  const tokens = prefix.trim().split(/\s+/).slice(-3);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const raw = tokens[i];
    // «a 9-7 edge in shots» er et talpar, ikke syv skud. Uden det her blev
    // bindestregen spist af ordopdelingen og parret læst som 97.
    if (new RegExp(`\\d[${DASHES}]\\d`).test(raw)) return null;
    const w = raw.replace(/[^0-9a-zæøå]/gi, "").toLowerCase();
    if (!w) continue;
    const n = /^\d+$/.test(w) ? Number(w) : WORD_NUMBERS[w];
    if (n !== undefined) return n;
  }
  return null;
}

/**
 * Antal spillede kampe, som kildens rekord-strenge oplyser dem.
 *
 * MINIMUM, ikke maksimum: kilden nævner også modstanderens rekord, og vi ved
 * ikke altid hvem der er hvem. Er selv det LAVESTE tal ≥ 2, har intet hold i
 * kilden spillet sin første kamp — og så er «season opener» forkert, uanset
 * hvilken rekord der hører til hvem.
 *
 * 0-0 tælles ikke med: en konferencerekord på 0-0 står i næsten hver kilde
 * («2-0, 0-0 Ivy League») og ville ellers trykke minimum ned på nul hver gang.
 */
export function minGamesPlayed(hits: PairHit[]): number | null {
  let min: number | null = null;
  for (const h of hits) {
    if (h.role !== "record") continue;
    const games = h.parts.reduce((a, b) => a + b, 0);
    if (games < 1) continue;
    if (min === null || games < min) min = games;
  }
  return min;
}

/**
 * Handler sætningen om den kamp artiklen dækker?
 *
 * En kladde må gerne nævne andre kampe — «sejren følger et 1-0-nederlag til
 * Cornell i sæsonpremieren» er korrekt og kildebelagt et andet sted. Uden det
 * her krav flagede tjekket to UDGIVNE artikler for netop dét, og et tjek der
 * fyrer på rigtig tekst er værre end ingen.
 *
 * Modstanderen er den billigste markør: står den i sætningen, er det den her
 * kamp. Kender faktaarket hverken modstander eller resultat, siger vi
 * ingenting — vi kan ikke afgøre det.
 *
 * Kun regel 1's anden gren bruger den. Den gren bygger på et FRAVÆR (parret
 * står ikke i kilden), og et fravær tåler ikke tvivl om hvilken kamp der tales
 * om. Sæsonpremiere-reglen bruger `PRIOR_MATCH_CUES` i stedet, fordi kravet om
 * modstanderens navn i samme sætning kostede fire ud af seks ægte fund.
 */
function aboutThisEvent(sentence: string, opponent: string, finalScore: string): boolean | null {
  if (!opponent && !finalScore) return null;
  const s = sentence.toLowerCase();
  if (opponent && s.includes(opponent.toLowerCase())) return true;
  if (finalScore && s.includes(finalScore)) return true;
  return false;
}

export function numberRoleFindings(input: RoleInput): RoleFinding[] {
  const draft = `${input.title}\n${input.content}`;
  const source = input.sourceText ?? "";
  if (!source.trim()) return [];

  const findings: RoleFinding[] = [];
  const sourcePairs = pairsIn(source);
  const { finalScore, opponent } = factsOf(input.factSheet);

  // ── 1. En score kilden kun har som rekord ────────────────────────────────
  const reported = new Set<string>();
  for (const hit of pairsIn(draft)) {
    if (hit.role !== "final" || reported.has(hit.pair)) continue;
    const inSource = sourcePairs.filter((p) => p.pair === hit.pair);

    if (inSource.length > 0 && inSource.every((p) => p.role === "record")) {
      reported.add(hit.pair);
      findings.push({
        kind: "score_is_record",
        // Kort nok til badgen og Discord-linjen; sætningen selv står i `why`.
        claim: `${hit.pair} som kampens resultat`,
        why:
          `«${hit.context}» — men ${hit.pair} står i kilden som holdets stilling: ` +
          `«${inSource[0].context}»` +
          (finalScore ? `. Faktaarkets resultat er ${finalScore}` : ". Faktaarket har ingen score"),
      });
      continue;
    }
    // Parret findes slet ikke i kilden, men faktaarket har en anden score.
    // Kun når sætningen handler om DENNE kamp: en tidligere kamps resultat er
    // ikke en påstand om denne.
    if (inSource.length === 0 && finalScore && finalScore !== hit.pair) {
      if (aboutThisEvent(hit.context, opponent, finalScore) !== true) continue;
      reported.add(hit.pair);
      findings.push({
        kind: "score_conflict",
        claim: `${hit.pair} som kampens resultat`,
        why:
          `«${hit.context}» — faktaarkets resultat er ${finalScore}, ` +
          `og ${hit.pair} står ingen steder i kilden`,
      });
    }
  }

  // ── 2. En hæder båret af det forkerte tal ────────────────────────────────
  const names = (input.athleteNames ?? [])
    .filter((n): n is string => Boolean(n && n.trim()))
    .flatMap((n) => {
      const parts = n.toLowerCase().split(/\s+/).filter(Boolean);
      // Efternavnet alene: kilden skriver «MacLean», ikke «Marianna MacLean».
      return parts.length > 1 ? [n.toLowerCase(), parts[parts.length - 1]] : parts;
    });
  if (names.length) {
    const sourceRanks = rankClaims(source, names);
    for (const [noun, numbers] of rankClaims(draft, names)) {
      const known = sourceRanks.get(noun);
      if (!known || known.size === 0) continue;
      for (const n of numbers) {
        if (known.has(n)) continue;
        findings.push({
          kind: "rank_number",
          claim: `${n} ${noun}`,
          why:
            `kilden lader ${[...known].join("/")} ${noun} bære placeringen, ikke ${n} — ` +
            "sæsontal og kamptal er ikke det samme",
        });
      }
    }
  }

  // ── 3. «Season opener» som rekorden modsiger ─────────────────────────────
  for (const s of sentences(draft)) {
    const opener = OPENER_CUES.exec(s);
    if (!opener) continue;
    // Kladden må godt omtale en TIDLIGERE kamp som sæsonpremieren. Det gjorde
    // to udgivne artikler, helt korrekt.
    if (PRIOR_MATCH_CUES.test(s)) continue;
    const games = minGamesPlayed(sourcePairs);
    if (games !== null && games >= 2) {
      findings.push({
        kind: "opener_vs_record",
        claim: opener[0],
        why: `kildens rekord viser mindst ${games} spillede kampe — det her er ikke sæsonens første`,
      });
    }
    break;
  }

  return findings;
}
