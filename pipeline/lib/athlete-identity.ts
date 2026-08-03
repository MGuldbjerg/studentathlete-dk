/**
 * Atlet-identitet til dedup på tværs af navne-varianter og skoleskift (transfers).
 *
 * Slug'en (generateSlug) er afledt af det FULDE navn, så "Marqus Mitrovic Marion"
 * og "Marqus Marion" får forskellige slugs → INSERT OR IGNORE kan ikke dedupe dem.
 * normalizeIdentity() reducerer til fornavn+efternavn (uden mellemnavne/initialer/
 * suffikser) så de to varianter matcher som samme person.
 *
 * NAVNE-MATCH ER IKKE NOK. Skifter skolen EFTERNAVNET på en atlet (Filucca
 * Daugaard → Filucca Andersen, NMSU 2026) er de to rækker usynlige for
 * normalizeIdentity, og hometown-vagten blokerer endda et merge ("Denmark" vs
 * "Horsens, Denmark"). Derfor bruger vi skolens EGEN nøgle: bio_url'ens sidste
 * segment er et stabilt spiller-id hos Sidearm (…/roster/filucca-daugaard/11192),
 * og navnedelen af URL'en er dekorativ — begge staveformer serverer samme profil.
 * rosterKey() = "vært#id" er derfor stærkere bevis end noget navne-heuristik.
 */
import { generateSlug } from "../../src/lib/slug";

/**
 * Stien lige før spiller-id'et skal være navne-segmentet. Uden denne vagt ville
 * en roster-URL som /sports/fodbold/roster/2026 give nøglen "vært#2026" og
 * flette to vilkårlige atleter fra samme skole.
 */
const NON_NAME_SEGMENTS = new Set(["roster", "season", "player", "sport", "sports", "team"]);

/**
 * Skolens eget spiller-id udledt af bio_url → "vært#id" (uden www).
 * Returnerer null når URL'en ikke eksponerer et numerisk id (fx
 * gopsusports.com/…/player/dikte-bang) — de rækker falder tilbage på
 * navne-match + dublet-køen. Hellere ingen nøgle end en navne-afledt nøgle,
 * der ville være præcis lige så skrøbelig som navnet selv.
 */
export function rosterKey(bioUrl: string | null | undefined): string | null {
  if (!bioUrl) return null;
  let u: URL;
  try {
    u = new URL(bioUrl);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (!host) return null;
  const segs = u.pathname.split("/").filter((s) => s.length > 0);
  const id = segs[segs.length - 1] ?? "";
  if (!/^\d+$/.test(id)) return null;
  const before = (segs[segs.length - 2] ?? "").toLowerCase();
  if (!before || NON_NAME_SEGMENTS.has(before)) return null;
  return `${host}#${id}`;
}

/**
 * Hvad siger skolens egne nøgler om to rækker?
 *  - "same"      begge har SAMME nøgle → samme person, uanset navn/hometown.
 *  - "different" samme skole (vært), forskelligt id → to forskellige personer;
 *                overtrumfer navne-match (to ægte navnesøstre på samme hold).
 *  - "unknown"   mindst én mangler nøgle, ELLER nøglerne peger på hver sin skole
 *                (= muligt skoleskift) → afgøres af navne-logikken.
 */
export function rosterVerdict(
  a: { bio_url?: string | null },
  b: { bio_url?: string | null },
): "same" | "different" | "unknown" {
  const ka = rosterKey(a.bio_url);
  const kb = rosterKey(b.bio_url);
  if (!ka || !kb) return "unknown";
  if (ka === kb) return "same";
  return ka.split("#")[0] === kb.split("#")[0] ? "different" : "unknown";
}

/** Navnesuffikser der ikke er en del af identiteten. */
const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

/** Slug-normaliserede navne-tokens uden suffikser. */
function nameTokens(name: string): string[] {
  return generateSlug(name)
    .split("-")
    .filter((t) => t.length > 0 && !NAME_SUFFIXES.has(t));
}

/**
 * Reducér et navn til en stabil identitetsnøgle "fornavn|efternavn" (slug-normaliseret,
 * mellemnavne + suffikser fjernet). To rosters der staver navnet forskelligt
 * (mellemnavn med/uden, "Jr." osv.) giver samme nøgle.
 */
export function normalizeIdentity(name: string): string {
  const tokens = nameTokens(name);
  if (tokens.length === 0) return "";
  if (tokens.length === 1) return tokens[0];
  return `${tokens[0]}|${tokens[tokens.length - 1]}`;
}

/** Mellemnavne (alt mellem fornavn og efternavn). */
function middleTokens(name: string): Set<string> {
  return new Set(nameTokens(name).slice(1, -1));
}

/**
 * Er mellemnavnene forenelige? Hvis mindst én mangler mellemnavn → ja (fx
 * "Marqus Marion" vs "Marqus Mitrovic Marion"). Hvis BEGGE har mellemnavne skal
 * det ene sæt være delmængde af det andet — ellers er det to forskellige personer
 * (fx "Oliver Møller-Jensen" vs "Oliver Juul Jensen": moller ≠ juul).
 */
function middlesCompatible(a: string, b: string): boolean {
  const ma = middleTokens(a);
  const mb = middleTokens(b);
  if (ma.size === 0 || mb.size === 0) return true;
  const [small, big] = ma.size <= mb.size ? [ma, mb] : [mb, ma];
  for (const t of small) if (!big.has(t)) return false;
  return true;
}

/** En atlet-række set fra identitetens synsvinkel. */
export interface IdentityRow {
  name: string;
  /** Skolens stavemåde, hvis den afviger fra det viste navn (manuel rettelse). */
  roster_name?: string | null;
  sport: string;
  hometown: string | null;
  bio_url?: string | null;
}

/**
 * Alle navne en række kender sig selv under. Er navnet rettet i hånden
 * ("Malthe Bøgebjerg") skal skolens ASCII-form ("Malthe Bogebjerg") stadig
 * matche ved næste scrape — ellers ville rettelsen selv skabe en dublet.
 */
function nameVariants(r: IdentityRow): string[] {
  const out = [r.name, r.roster_name ?? ""].filter((n) => n.trim().length > 0);
  return out.length > 0 ? out : [];
}

/** Matcher mindst én navne-variant på tværs af de to rækker? */
function namesMatch(a: IdentityRow, b: IdentityRow): boolean {
  for (const na of nameVariants(a)) {
    for (const nb of nameVariants(b)) {
      const ia = normalizeIdentity(na);
      if (!ia || ia !== normalizeIdentity(nb)) continue;
      // Modstridende mellemnavne → forskellige personer (selv med samme for-/efternavn).
      if (middlesCompatible(na, nb)) return true;
    }
  }
  return false;
}

/**
 * Er to atlet-rækker sandsynligvis samme person?
 *
 * Skolens eget spiller-id afgør sagen når begge rækker har ét (rosterVerdict):
 * samme id → samme person selv ved forskelligt efternavn; forskelligt id på
 * SAMME skole → forskellige personer selv ved identisk navn. Ellers falder vi
 * tilbage på navne-match + sport, med hometown som vagt: er BEGGE udfyldt og
 * forskellige byer, er det to forskellige personer (undgår fejlmerge af to ægte
 * danskere med samme navn). Tom hometown på en af dem → antaget samme (typisk en
 * seed-/recruiting-række uden hometown vs. en scrapet række med).
 */
export function samePerson(a: IdentityRow, b: IdentityRow): boolean {
  // Sport er en hård betingelse hele vejen: skolernes spiller-id'er ser ud til at
  // være site-brede, men vi antager det ikke — to sportsgrene, to personer.
  if (a.sport !== b.sport) return false;

  const verdict = rosterVerdict(a, b);
  if (verdict === "same") return true;
  if (verdict === "different") return false;

  if (!namesMatch(a, b)) return false;

  if (a.hometown && b.hometown) {
    return normalizeIdentity(a.hometown) === normalizeIdentity(b.hometown)
      // by-del kan afvige (kun komma-prefiks) — sammenlign første segment
      || hometownCity(a.hometown) === hometownCity(b.hometown);
  }
  return true; // mindst én mangler hometown → antaget samme person
}

/** Første (by-)segment af en hometown, slug-normaliseret. */
function hometownCity(hometown: string): string {
  return generateSlug(hometown.split(/[,/]/)[0] ?? "");
}

// ─── Dublet-kandidater (til menneskelig afgørelse) ────────────────────────────

/** Hometown uden by — "Denmark" alene udelukker ingen. */
function isBareCountry(hometown: string | null): boolean {
  const c = hometownCity(hometown ?? "");
  return c === "denmark" || c === "danmark" || c === "";
}

export interface CandidateRow extends IdentityRow {
  id: number;
  university: string;
  class_year: string | null;
  position: string | null;
}

export interface MergeSuggestion {
  score: number;
  reasons: string[];
}

/** Mindste score der er værd at bede et menneske kigge på. */
export const MERGE_CANDIDATE_MIN_SCORE = 3;

/**
 * Ligner to rækker samme person UDEN at reglerne kan afgøre det?
 *
 * Kun for par som samePerson() IKKE fanger — altså dem uden fælles spiller-id
 * og uden navne-match. Det er hullet "Filucca Daugaard"/"Filucca Andersen" ville
 * være faldet i, hvis skolen ikke havde lagt id'et i bio_url'en: samme skole,
 * samme sport, samme årgang, samme fornavn, foreneligt hometown.
 *
 * Returnerer null når parret ikke er værd at spørge om. Aldrig grundlag for
 * automatisk fletning — output går i merge_candidates til godkendelse.
 */
export function mergeCandidate(a: CandidateRow, b: CandidateRow): MergeSuggestion | null {
  if (a.id === b.id) return null;
  if (a.sport !== b.sport) return null;
  if (a.university !== b.university) return null;
  // Skolens egne id'er har allerede talt: samme id → flettes automatisk,
  // forskelligt id på samme skole → bevisligt to personer.
  if (rosterVerdict(a, b) !== "unknown") return null;
  if (samePerson(a, b)) return null;

  const reasons: string[] = [];
  let score = 0;

  const [fa, la] = splitFirstLast(a);
  const [fb, lb] = splitFirstLast(b);
  if (fa && fa === fb) {
    score += 2;
    reasons.push("samme fornavn");
  }
  if (la && la === lb) {
    score += 2;
    reasons.push("samme efternavn");
  }
  if (score === 0) return null; // hverken for- eller efternavn deles → ikke en kandidat

  score += 1;
  reasons.push("samme skole og sport");

  if (a.class_year && a.class_year === b.class_year) {
    score += 1;
    reasons.push(`samme årgang (${a.class_year})`);
  }

  if (a.hometown && b.hometown && hometownCity(a.hometown) === hometownCity(b.hometown)) {
    score += 2;
    reasons.push("samme hjemby");
  } else if (isBareCountry(a.hometown) || isBareCountry(b.hometown)) {
    score += 1;
    reasons.push("hjemby forenelig (kun land angivet på den ene)");
  } else {
    return null; // to forskellige byer → to forskellige personer
  }

  if (a.position && a.position === b.position) {
    score += 1;
    reasons.push("samme position");
  }

  return score >= MERGE_CANDIDATE_MIN_SCORE ? { score, reasons } : null;
}

/** [fornavn, efternavn] slug-normaliseret fra det viste navn. */
function splitFirstLast(r: IdentityRow): [string, string] {
  const t = nameTokens(r.name);
  if (t.length === 0) return ["", ""];
  return [t[0], t[t.length - 1]];
}
