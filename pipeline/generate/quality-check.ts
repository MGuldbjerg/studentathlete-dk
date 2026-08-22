/**
 * KVALITETSTJEK AF EN KLADDE — mekanisk, uden model.
 * =================================================
 *
 * Hvorfor ikke `verify-article.ts`? Den spørger en gratis model «er alle påstande
 * dækket af faktaarket?». Review-loggen viser hvad det er værd: af 11 afvisninger
 * var 4 IKKE flaget høj, og af 5 redigerede var 3 flaget høj. Den ratede en kladde
 * om det forkerte menneske `low` og en korrekt, men klichéfyldt, `high`. Den måler
 * FORMULERINGER, ikke virkelighed — og den er samme modelklasse som den der skrev
 * kladden, så de er blinde på samme steder.
 *
 * Denne fil måler i stedet det der kan MÅLES, og gør det uden et modelkald:
 *
 *   tal        Står ethvert tal, hver alder og hver dato i kladden også i kilden
 *              eller faktaarket? («23-årige» og «18 kampe» var opdigtet i #105.)
 *   navne      Står hvert person-navn (to store bogstaver i træk) i kilden?
 *              (Cheftræneren «Mark Carr» i #107 fandtes ikke; han heder Daniel
 *              Clitnovici og stod på kildens egen side.)
 *   citater    Citat i kladden + tomt `quotes` i faktaarket = opdigtet (#99).
 *   identitet  Optræder atletens fornavn overhovedet i kilden? (#101 og #102
 *              handlede om ET ANDET MENNESKE.)
 *   stedord    Stemmer kladdens stedord med `athletes.gender`? (Almi Nerurkar blev
 *              «he» hele vejen.)
 *   tid        Er begivenheden overstået? (Genbruger forhåndsomtale-vagten.)
 *   årgang     Fremskriver kladden en sæson for en atlet med Sr./Gr.? (Regel 25.)
 *
 * Alle syv er de fejlklasser der faktisk har kostet noget, og alle syv er
 * afgørbare uden at spørge en model om et skøn. Resultatet er derfor et signal der
 * KAN korrelere med beslutningerne i `review_log` — og som kan efterprøves mod dem.
 *
 * Fund er FORSLAG til et menneske, ikke en gate. Ingen kladde bliver slettet af
 * denne fil.
 */

import { checkEventTiming } from "./event-timing";

export interface Finding {
  severity: "high" | "medium";
  category: "numbers" | "names" | "quotes" | "identity" | "pronouns" | "timing" | "class_year";
  /** Det konkrete i kladden der udløste fundet. */
  claim: string;
  /** Hvad et menneske skal kigge efter. */
  why: string;
}

export interface CheckInput {
  title: string;
  content: string;
  /** Faktaarkets rå JSON fra `stories.fact_sheet`. */
  factSheet: string | null;
  /** Kildens tekst (`stories.content_raw` ?? `stories.summary`). */
  sourceText: string | null;
  athlete: {
    name: string;
    /** Skolens kaldenavn ("Ogbe" for Ogbemudia) — `athletes.preferred_name`. */
    preferredName?: string | null;
    gender: string | null;
    classYear: string | null;
    university: string | null;
    hometown: string | null;
  } | null;
  /** Sprog — styrer stedord og tids-markører. */
  language: "da" | "en";
}

/** Tal vi aldrig flager: sæsonår og de årstal atletens egne data indeholder. */
function benignNumbers(input: CheckInput, now: Date): Set<string> {
  const y = now.getFullYear();
  const out = new Set<string>();
  for (const n of [y - 1, y, y + 1, y + 2, y + 3, y + 4, y + 5]) out.add(String(n));
  // Tocifrede sæsonhaler: "2026-27" giver også "27".
  for (const n of [y, y + 1, y + 2]) out.add(String(n).slice(2));
  return out;
}

/**
 * Dansk genitiv gør et navn til et NYT ord: «Claes Nielsens assists», «Belmonts
 * offensiv», «Bruins’ mål». Uden dette flagede tjekket atletens EGET navn som
 * ukendt — første falske fund på den første rigtige kladde (#108).
 */
function degenitive(word: string): string {
  return word.replace(/['’]s$/, "").replace(/['’]$/, "").replace(/s$/, "");
}

/**
 * Dansk sætter fællesnavnet efter en bindestreg på egennavnet: «Seton
 * Hall-spiller», «Hermann Trophy-liste», «BIG EAST-trænernes». Uden det her
 * blev hele sammensætningen læst som ét ukendt navn, og HVER dansk artikel fik
 * et falsk fund — værre end ingen kontrol, for falske fund lærer læseren at
 * ignorere listen. Vi prøver derfor også leddet FØR bindestregen.
 *
 * Det svækker ikke kontrollen: prefikset skal stadig stå i kilden, så
 * «Opdigtet Navn-mål» bliver stadig fanget.
 */
function compoundHead(word: string): string | null {
  const i = word.lastIndexOf("-");
  return i > 0 ? word.slice(0, i) : null;
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[   ]/g, " ")
    .replace(/[.,]/g, (m) => m) // beholdt: tal-sammenligning sker på cifre
    .replace(/\s+/g, " ");
}

/** Alle tal-strenge i en tekst (heltal, decimaler, tider, scorer). */
export function numbersIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?/g)) out.push(m[0].replace(",", "."));
  return out;
}

/**
 * Ord der er STORE fordi sætningen begynder der, eller fordi dansk skriver dem
 * sådan — aldrig fordi de er navne. Uden listen blev «Danske Marie Eline»,
 * «Udover Bangerts» og «Med Uagboe» flaget som ukendte personer på kladder
 * Mikkel godkendte uændret (målt 2026-08-19: 41 navnefund, kun 6 som mennesket
 * faktisk fjernede).
 */
const FUNCTION_WORDS = new Set([
  // dansk
  "danske", "dansk", "danskeren", "danskerens", "britiske", "britisk", "udover",
  "med", "for", "efter", "ifølge", "den", "det", "de", "der", "han", "hun", "hans",
  "hendes", "i", "på", "til", "som", "da", "og", "men", "nu", "her", "sidste",
  "første", "andet", "andre", "både", "en", "et", "alt", "både", "hvor", "når",
  "siden", "under", "over", "mens", "samtidig", "desuden", "dermed", "derfor",
  "trods", "foran", "bag", "ved", "om", "af", "fra", "hos", "mod", "uden",
  // engelsk
  "the", "his", "her", "in", "on", "to", "as", "and", "but", "now", "also",
  "both", "last", "first", "other", "despite", "beyond", "besides", "after",
  "before", "while", "when", "where", "with", "from", "at", "by", "for",
]);

/** Ord der gør et navn til en INSTITUTION frem for en person. */
const INSTITUTION_WORDS = new Set([
  "university", "universitet", "college", "conference", "division", "championship",
  "championships", "team", "cup", "league", "invitational", "classic", "open",
  "state", "tech", "academy", "school", "club", "association", "all-american",
]);

function isInstitution(name: string): boolean {
  return name
    .toLowerCase()
    .split(/[\s-]+/)
    .some((w) => INSTITUTION_WORDS.has(w));
}

/**
 * Navne: to eller tre store forbogstaver i træk ("Mark Carr", "Big West").
 *
 * Enkeltord ville støje enormt på dansk, hvor sætninger begynder med stort og
 * hvor institutioner, byer og ugedage optræder overalt. To ord i træk er til
 * gengæld næsten altid et egennavn — og det er præcis formen på de opdigtede
 * trænere og de forkerte atleter vi har set.
 *
 * To fælder, begge målt på rigtige kladder:
 *  · Et ord der kun er stort fordi sætningen begynder der, hænger ved
 *    («Cheftræner Mark Carr»). Derfor trimmes funktionsord fra begge ender.
 *  · Et match må ikke krydse en sætnings- eller linjegrænse: «…Uagboe\nIfølge…»
 *    blev ét «navn».
 */
export function properNamesIn(text: string): string[] {
  const out = new Set<string>();
  const re = /\p{Lu}[\p{Ll}'’-]+(?:\s+\p{Lu}[\p{Ll}'’-]+){1,2}/gu;
  // Del ved sætnings- og linjegrænser, så ingen kandidat spænder over dem.
  for (const segment of text.split(/[.!?:;\n]+/)) {
    for (const m of segment.matchAll(re)) {
      const words = m[0].replace(/\s+/g, " ").split(" ");
      // Trim funktionsord fra begge ender.
      while (words.length > 0 && FUNCTION_WORDS.has(words[0].toLowerCase())) words.shift();
      while (words.length > 0 && FUNCTION_WORDS.has(words[words.length - 1].toLowerCase())) words.pop();
      if (words.length < 2) continue;
      out.add(words.join(" "));
      if (words.length === 3) out.add(words.slice(1).join(" "));
    }
  }
  return [...out];
}

/**
 * Citater: typografiske og lige anførselstegn samt markdown-blockquotes.
 *
 * Kravet om at det skal LIGNE tale er tilføjet efter måling: et løst
 * anførselstegn (fx om et prisnavn) fik regexen til at opfange almindelig
 * brødtekst mellem to tegn, og 14 citat-fund gav kun 2 rigtige. Nu skal spanden
 * være på én linje, af rimelig længde, og enten slutte som en sætning eller stå
 * ved siden af et sige-verbum.
 */
const SPEECH_VERBS = /\b(sagde|siger|udtaler|fortæller|fortalte|udtalte|forklarer|forklarede|said|says|added|explained|told)\b/i;

export function quotesIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/[«"„”“]([^«»"„”“\n]{20,240})[»"”“]/g)) {
    const span = m[1].trim();
    const after = text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 60);
    const before = text.slice(Math.max(0, (m.index ?? 0) - 60), m.index ?? 0);
    // Kolon lige før anførselstegnet er dansk journalistiks tydeligste
    // tale-markør: «Cheftræneren er tilfreds: «…»».
    // Et citat er TILSKREVET nogen. Uden det krav opfangede regexen kladdens
    // egen manchet, hver gang der stod et løst anførselstegn i teksten: 14
    // citat-fund gav kun 2 rigtige (målt 2026-08-19).
    const introducedByColon = /:\s*$/.test(before);
    const speechLike = introducedByColon || SPEECH_VERBS.test(after) || SPEECH_VERBS.test(before);
    if (speechLike) out.push(span);
  }
  // Blockquotes: i DETTE hus er en indledende «>»-linje MANCHETTEN, ikke et
  // citat. Alle citat-fund på rigtige kladder viste sig at være netop den
  // manchet (målt 2026-08-19: 14 fund, 2 rigtige). Et blockquote tælles derfor
  // kun som citat hvis det er tilskrevet — eller står inde i brødteksten med
  // anførselstegn.
  const lines = text.split("\n");
  let bodySeen = false;
  for (const [i, line] of lines.entries()) {
    const t = line.trim();
    if (t === "") continue;
    if (!t.startsWith(">")) {
      bodySeen = true;
      continue;
    }
    if (t.length <= 14) continue;
    const inner = t.slice(1).trim();
    const isManchet = !bodySeen && i < 3;
    if (isManchet) continue;
    const attributed = SPEECH_VERBS.test(inner) || /[«"„”“]/.test(inner);
    if (attributed) out.push(inner);
  }
  return out;
}

const PRONOUNS = {
  da: { m: ["han", "hans", "ham"], f: ["hun", "hendes", "hende"] },
  en: { m: ["he", "his", "him"], f: ["she", "her", "hers"] },
} as const;

const FUTURE_MARKERS = {
  da: ["næste sæson", "kommende sæson", "den nye sæson", "i den kommende", "skal spille", "forventes at"],
  en: ["next season", "the coming season", "this coming", "will play", "is poised", "expected to"],
} as const;

function hasWord(text: string, word: string): boolean {
  return new RegExp(`(?<![\\p{L}])${word}(?![\\p{L}])`, "iu").test(text);
}

interface FactSheet {
  quotes?: unknown;
  stats?: unknown;
  facts?: unknown;
  [k: string]: unknown;
}

function parseFactSheet(raw: string | null): FactSheet | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as FactSheet) : null;
  } catch {
    return null;
  }
}

/**
 * Kør alle tjek. Rækkefølgen af fund er efter alvor, så det første et menneske
 * læser, er det vigtigste.
 */
export function checkDraft(input: CheckInput, now: Date = new Date()): Finding[] {
  const findings: Finding[] = [];
  const fs = parseFactSheet(input.factSheet);
  const fsText = input.factSheet ?? "";
  const haystack = normalise(
    [
      input.sourceText ?? "",
      fsText,
      input.athlete?.name ?? "",
      input.athlete?.university ?? "",
      input.athlete?.hometown ?? "",
    ].join("\n"),
  );
  const draft = `${input.title}\n${input.content}`;

  // ── 1. Tal ────────────────────────────────────────────────────────────────
  const benign = benignNumbers(input, now);
  const haystackNumbers = new Set(numbersIn(haystack));
  const seenNumbers = new Set<string>();
  for (const n of numbersIn(draft)) {
    if (benign.has(n) || seenNumbers.has(n)) continue;
    seenNumbers.add(n);
    if (haystackNumbers.has(n)) continue;
    // Tal med decimaler kan stå som "3.5" i kilden og "3,5" i kladden — begge
    // former er normaliseret til punkt, så et manglende match er ægte.
    findings.push({
      severity: "high",
      category: "numbers",
      claim: n,
      why: "tallet står hverken i kilden eller i faktaarket",
    });
  }

  // ── 2. Navne ──────────────────────────────────────────────────────────────
  const athleteName = normalise(input.athlete?.name ?? "");
  const missingNames: string[] = [];
  // Kortest først: så bliver "Mark Carr" fundet, ikke "Cheftræner Mark Carr".
  const athleteTokens = new Set(athleteName.split(" ").filter(Boolean).map(degenitive));
  for (const name of properNamesIn(input.content).sort((a, b) => a.length - b.length)) {
    const n = normalise(name);
    if (!n || athleteName.includes(n) || n.includes(athleteName)) continue;
    if (haystack.includes(n)) continue;
    const parts = n.split(" ");
    // Atletens eget navn i genitiv eller uden fornavn er ikke et ukendt navn.
    if (parts.every((p) => athleteTokens.has(degenitive(p)))) continue;
    // Delvist match tæller: kilden skriver måske "Big West Conference" hvor
    // kladden skriver "Big West" — og genitiv-s må ikke stå i vejen.
    const known = (p: string): boolean => {
      if (haystack.includes(p) || haystack.includes(degenitive(p))) return true;
      const head = compoundHead(p);
      return head !== null && (haystack.includes(head) || haystack.includes(degenitive(head)));
    };
    if (parts.every(known)) continue;
    // Et længere navn der indeholder et allerede flaget, er samme fund.
    if (missingNames.some((m) => n.includes(m))) continue;
    missingNames.push(n);
    // En institution der mangler i kilden er værd at se på, men en PERSON der
    // mangler, er den fejl der har kostet os to kladder om forkerte mennesker.
    const institution = isInstitution(name);
    findings.push({
      severity: institution ? "medium" : "high",
      category: "names",
      claim: name,
      why: institution
        ? "institutionen står ikke i kilden — tjek at holdet/turneringen er den rigtige"
        : "navnet står ikke i kilden — opdigtede trænere og forkerte personer ser sådan ud",
    });
  }

  // ── 3. Citater ────────────────────────────────────────────────────────────
  const fsQuotes = Array.isArray(fs?.quotes) ? (fs?.quotes as unknown[]) : [];
  const draftQuotes = quotesIn(input.content);
  if (draftQuotes.length > 0 && fsQuotes.length === 0) {
    findings.push({
      severity: "high",
      category: "quotes",
      claim: draftQuotes[0].slice(0, 80),
      why: "kladden citerer, men faktaarket har ingen citater",
    });
  }

  // ── 4. Identitet ──────────────────────────────────────────────────────────
  //
  // Kaldenavnet er en del af identiteten: kilden skriver «Ogbe Uagboe», basen
  // «Ogbemudia Uagboe». Uden det blev en korrekt kladde flaget for forkert
  // person (#79). Og står efternavnet i kilden, men ikke fornavnet, er det en
  // MILDERE tvivl end når intet af navnet findes.
  const nameParts = (input.athlete?.name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const preferred = (input.athlete?.preferredName ?? "").trim();
  if (firstName && input.sourceText) {
    const src = normalise(input.sourceText);
    const knowsFirst =
      src.includes(normalise(firstName)) || (preferred !== "" && src.includes(normalise(preferred)));
    const knowsLast = lastName !== "" && src.includes(normalise(lastName));
    if (!knowsFirst) {
      findings.push({
        severity: knowsLast ? "medium" : "high",
        category: "identity",
        claim: firstName,
        why: knowsLast
          ? "kun efternavnet står i kilden — er det den rigtige person i familien/på holdet?"
          : "atletens navn optræder ikke i kilden — handler historien om et andet menneske?",
      });
    }
  }

  // ── 5. Stedord ────────────────────────────────────────────────────────────
  const g = (input.athlete?.gender ?? "").toLowerCase();
  if (g === "m" || g === "f") {
    const wrong = PRONOUNS[input.language][g === "m" ? "f" : "m"];
    for (const w of wrong) {
      if (hasWord(input.content, w)) {
        findings.push({
          severity: "high",
          category: "pronouns",
          claim: w,
          why: `atleten er registreret som ${g === "m" ? "mand" : "kvinde"} i basen`,
        });
        break;
      }
    }
  }

  // ── 6. Tid ────────────────────────────────────────────────────────────────
  if (fs) {
    const timing = checkEventTiming({ factSheet: input.factSheet, now });
    if (!timing.ok) {
      findings.push({
        severity: "high",
        category: "timing",
        claim: timing.reason ?? "begivenheden er ikke overstået",
        why: "en kamp der ikke er spillet må ikke omtales i datid",
      });
    }
  }

  // ── 7. Årgang ─────────────────────────────────────────────────────────────
  const cls = (input.athlete?.classYear ?? "").toLowerCase();
  if (cls.startsWith("sr") || cls.startsWith("gr") || cls.startsWith("r-sr")) {
    for (const marker of FUTURE_MARKERS[input.language]) {
      if (input.content.toLowerCase().includes(marker)) {
        findings.push({
          severity: "medium",
          category: "class_year",
          claim: marker,
          why: `atleten er ${input.athlete?.classYear} og har måske ikke en sæson mere (regel 25)`,
        });
        break;
      }
    }
  }

  const order = { high: 0, medium: 1 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}

/**
 * Samlet alvor — og hvorfor det IKKE bare er «det værste enkeltfund».
 *
 * Målt mod Mikkels faktiske beslutninger (`pipeline/report/review-accuracy.ts`,
 * 2026-08-19) opfører kategorierne sig meget forskelligt:
 *
 *   class_year  2 fund → 2 rettet af mennesket
 *   quotes      2 fund → 1
 *   numbers    20 fund → 5
 *   names      24 fund → 4
 *
 * Identitet, tid, stedord og citater er PRÆCISE: fyrer de, er der noget galt.
 * Tal og navne er derimod LÆSEHJÆLP — de peger på påstande der skal efterprøves,
 * og fire femtedele af dem viste sig at være i orden. Lod vi et enkelt sådant
 * fund gøre badgen rød, ville næsten hver kladde være rød, og så er badgen lige
 * så ubrugelig som den gamle (den flagede 2 af 3 kladder Mikkel godkendte uændret).
 *
 * Derfor: de præcise kategorier sætter badgen. Tal og navne løfter den kun når de
 * optræder i KLYNGE — én ukildebelagt oplysning er en note, to er et mønster.
 *
 * Grænsen er MÅLT, ikke gættet. På de 21 kladder med bevaret tekst:
 *
 *   gammelt badge (modellen)      3/18 fanget · 0/3 falske alarmer
 *   ethvert fund = rød           12/18        · 2/3   ← ubrugelig som triage
 *   præcis ELLER klynge ≥ 2      10/18        · 0/3   ← valgt
 *   præcis ELLER klynge ≥ 3       8/18        · 0/3
 *
 * Grænse 2 fanger altså 3,3× så meget som det gamle badge UDEN at fejlflage en
 * eneste kladde Mikkel godkendte uændret. Kør rapporten igen når sæsonen har
 * givet flere beslutninger — n=21 er for lidt til at kalde det andet end det
 * bedste valg på det vi ved nu.
 */
const PRECISE: ReadonlySet<Finding["category"]> = new Set([
  "identity",
  "timing",
  "pronouns",
  "quotes",
  "class_year",
]);

const CLUSTER_THRESHOLD = 2;

export function severityOf(findings: Finding[]): "low" | "medium" | "high" {
  const precise = findings.filter((f) => PRECISE.has(f.category));
  if (precise.some((f) => f.severity === "high")) return "high";

  const aids = findings.filter((f) => !PRECISE.has(f.category));
  if (aids.length >= CLUSTER_THRESHOLD) return "high";
  if (precise.length > 0 || aids.length > 0) return "medium";
  return "low";
}

/** Én linje pr. fund, til Discord og til admin-badgen. */
export function summarise(findings: Finding[]): string {
  if (findings.length === 0) return "Ingen mekaniske fund.";
  const byCat = new Map<string, string[]>();
  for (const f of findings) {
    const list = byCat.get(f.category) ?? [];
    list.push(f.claim);
    byCat.set(f.category, list);
  }
  const label: Record<Finding["category"], string> = {
    numbers: "tal uden kilde",
    names: "navne uden kilde",
    quotes: "citat uden kilde",
    identity: "identitet",
    pronouns: "stedord",
    timing: "ikke overstået",
    class_year: "årgang",
  };
  return [...byCat.entries()]
    .map(([cat, claims]) => `${label[cat as Finding["category"]]}: ${claims.slice(0, 4).join(", ")}`)
    .join(" · ");
}
