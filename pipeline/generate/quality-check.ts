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
 * Navne: to eller tre store forbogstaver i træk ("Mark Carr", "Big West").
 *
 * Enkeltord ville støje enormt på dansk, hvor sætninger begynder med stort og
 * hvor institutioner, byer og ugedage optræder overalt. To ord i træk er til
 * gengæld næsten altid et egennavn — og det er præcis formen på de opdigtede
 * trænere og de forkerte atleter vi har set.
 *
 * Faldgruben: et ord der kun er stort fordi sætningen begynder der, hænger ved.
 * «Cheftræner Mark Carr sagde» giver tre store ord i træk. Derfor returneres
 * ogsÅ halen af et tre-ords-match ("Mark Carr"), og kalderen vælger det korteste
 * kandidat der mangler i kilden.
 */
export function properNamesIn(text: string): string[] {
  const out = new Set<string>();
  const re = /\p{Lu}[\p{Ll}'’-]+(?:\s+\p{Lu}[\p{Ll}'’-]+){1,2}/gu;
  for (const m of text.matchAll(re)) {
    const full = m[0].replace(/\s+/g, " ");
    out.add(full);
    const words = full.split(" ");
    if (words.length === 3) out.add(words.slice(1).join(" "));
  }
  return [...out];
}

/** Citater: typografiske og lige anførselstegn samt markdown-blockquotes. */
export function quotesIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/[«"„”“]([^«»"„”“]{12,})[»"”“]/g)) out.push(m[1].trim());
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t.startsWith(">") && t.length > 14) out.push(t.slice(1).trim());
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
    if (parts.every((p) => haystack.includes(p) || haystack.includes(degenitive(p)))) continue;
    // Et længere navn der indeholder et allerede flaget, er samme fund.
    if (missingNames.some((m) => n.includes(m))) continue;
    missingNames.push(n);
    findings.push({
      severity: "high",
      category: "names",
      claim: name,
      why: "navnet står ikke i kilden — opdigtede trænere og forkerte personer ser sådan ud",
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
  const firstName = (input.athlete?.name ?? "").trim().split(/\s+/)[0] ?? "";
  if (firstName && input.sourceText && !normalise(input.sourceText).includes(normalise(firstName))) {
    findings.push({
      severity: "high",
      category: "identity",
      claim: firstName,
      why: "atletens fornavn optræder ikke i kilden — handler historien om et andet menneske?",
    });
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

/** Samlet alvor: den værste enkeltfund. Tom liste = 'low'. */
export function severityOf(findings: Finding[]): "low" | "medium" | "high" {
  if (findings.some((f) => f.severity === "high")) return "high";
  if (findings.length > 0) return "medium";
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
