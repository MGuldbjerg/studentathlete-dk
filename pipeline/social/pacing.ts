/**
 * Adaptiv pacing for social-køen.
 *
 * Idé: afstanden mellem opslag pr. kanal afhænger af kø-dybden — køen skal
 * kunne tømmes inden for drainTargetMinutes, men aldrig hurtigere end
 * minGapMinutes (hård grænse mod spam) og aldrig langsommere end
 * maxGapMinutes (så enkeltartikler ikke hænger unødigt).
 *
 * Friskhed: opslag der har stået i kø længere end expiryMinutes er ikke
 * længere nyheder og markeres 'expired' i stedet for at blive postet.
 *
 * ⚠️ HVORFOR KØRSLEN POSTER FLERE AD GANGEN (2026-09-14). Pacingen regnede
 * rigtigt, men leverede ikke: den var skrevet ud fra at drænet kører hver time,
 * og det gør det ikke. `social-post.yml` beder om '15 * * * *', men GitHub
 * Actions' skemalægning skrider — 13. september fyrede den 01:03, 06:14, 12:03,
 * 16:22, 19:29, 22:26, altså 6-8 gange i døgnet. Med ét opslag pr. kørsel var
 * den reelle kapacitet ~12 opslag pr. 48 timer, og 48 timer er præcis
 * udløbsgrænsen. Resultatet står i basen: 4. september blev 18 britiske
 * artikler lagt i kø, 12 kom ud, **6 udløb med attempts = 0** — aldrig forsøgt,
 * ingen fejl, ingen besked. 7. september kostede det én mere.
 *
 * Derfor svarer pacingen nu med et ANTAL i stedet for ja/nej: hvor mange
 * opslag har gap'et budgetteret siden sidste opslag. Er der gået 5 timer og
 * gap'et er 80 minutter, skylder vi 3. Gennemsnittet er uændret — det er kun
 * klumpningen der flytter sig fra "tabt" til "sendt i én omgang".
 */

export interface PacingConfig {
  minGapMinutes: number;
  maxGapMinutes: number;
  drainTargetMinutes: number;
  expiryMinutes: number;
  /**
   * Loft over ÉN kørsels indhentning. Uden det ville en uges nedbrud i
   * Actions tømme hele køen i ét brag næste gang den kørte.
   *
   * 4 er valgt mod den målte kadence: ~6 kørsler i døgnet × 4 = 24 opslag,
   * altså nøjagtig det samme dagsloft som den hårde grænse på 1/time/kanal
   * allerede satte. Indhentningen hæver gennemsnittet op til det loft —
   * den hæver ikke loftet.
   */
  maxPerRun: number;
}

export const DEFAULT_PACING: PacingConfig = {
  minGapMinutes: 60, // hård grænse: max 1 opslag/time/kanal i gennemsnit
  maxGapMinutes: 180, // generøs spacing når køen er lille
  drainTargetMinutes: 24 * 60, // køen skal kunne tømmes på et døgn
  expiryMinutes: 48 * 60, // ældre i kø end 48t → expired
  maxPerRun: 4, // loft over indhentning i én kørsel
};

/**
 * Bluesky poster tættere end resten.
 *
 * Mikkel, 17. september 2026: «make the Bluesky queue 55 minutes instead of
 * 180». De 180 er `maxGapMinutes` — den generøse afstand når køen er lille —
 * men 55 ligger UNDER `minGapMinutes`, den hårde grænse på ét opslag i timen.
 * Derfor er det ikke ét tal der ændres: begge ender flyttes til 55, ellers
 * regner `computeGapMinutes` gulvet (60) op og loftet (55) ned igen, og
 * resultatet ville være konstant 55 uden nogen adaptiv opførsel overhovedet.
 *
 * Med 55 minutter er afstanden mindre end kørsels-intervallet, så drænet
 * sender ét opslag hver gang det kører — hvilket er hele pointen: 25 britiske
 * artikler udgivet på én gang kunne ikke nå ud på 48 timer med 180 minutters
 * afstand, og seks britiske artikler udløb uforsøgt 4. september.
 *
 * KUN Bluesky. Facebook og Instagram er Metas platforme med Metas tolerance og
 * beholder 60/180 — et fælles tal ville have flyttet dem i tavshed.
 */
export const BLUESKY_PACING: PacingConfig = {
  ...DEFAULT_PACING,
  minGapMinutes: 55,
  maxGapMinutes: 55,
};

/**
 * Pacing for én kanal. Kanaler uden egen post i tabellen kører på DEFAULT.
 * Slås op på KANALEN, ikke platformen: de to Bluesky-konti er to køer, og
 * det er køen der pacer.
 */
const CHANNEL_PACING: Record<string, PacingConfig> = {
  bluesky: BLUESKY_PACING,
  bluesky_uk: BLUESKY_PACING,
};

export function pacingFor(channel: string): PacingConfig {
  return CHANNEL_PACING[channel] ?? DEFAULT_PACING;
}

/**
 * D1's datetime('now') gemmer "YYYY-MM-DD HH:MM:SS" i UTC uden zone-suffix —
 * new Date() ville tolke det som lokal tid, så vi tilføjer Z selv.
 */
export function parseUtc(dbDate: string): Date {
  if (dbDate.includes("T") || dbDate.endsWith("Z")) return new Date(dbDate);
  return new Date(dbDate.replace(" ", "T") + "Z");
}

/**
 * Afstanden mellem to opslag på kanalen.
 *
 * To budgetter, og det STRAMMESTE vinder:
 *
 *  1. Dræn-målet: hele køen ud på et døgn (`drainTargetMinutes / dybde`).
 *  2. Deadline: alt ud FØR det ældste udløber (`minutesUntilExpiry / dybde`).
 *
 * Det andet budget er tilføjet 2026-09-14 og er grunden til at genafspilningen
 * af 4. september går fra 16 ud af 18 til 18 ud af 18. Uden det kender
 * pacingen kun dybden: køen skrumper, gap'et vokser mod maxGapMinutes, og de
 * sidste artikler bliver spacet med 3 timer selv når de har 4 timer tilbage at
 * leve i. En kø der er ved at løbe tør for tid, skal skynde sig — men aldrig
 * hurtigere end minGapMinutes, som stadig er den hårde grænse mod spam.
 *
 * `minutesUntilExpiry` er null når ingen deadline er kendt (fx i en ren
 * dybde-beregning); så gælder budget 1 alene, præcis som før.
 */
export function computeGapMinutes(
  queueDepth: number,
  cfg: PacingConfig = DEFAULT_PACING,
  minutesUntilExpiry: number | null = null,
): number {
  if (queueDepth <= 0) return cfg.maxGapMinutes;
  const byDrainTarget = cfg.drainTargetMinutes / queueDepth;
  const byDeadline =
    minutesUntilExpiry === null ? Infinity : Math.max(0, minutesUntilExpiry) / queueDepth;
  const raw = Math.min(byDrainTarget, byDeadline);
  return Math.min(cfg.maxGapMinutes, Math.max(cfg.minGapMinutes, raw));
}

/**
 * Hvor mange opslag må denne kørsel sende på kanalen?
 *
 * Svaret er "hvor mange gap'er der er gået siden sidste opslag", begrænset af
 * hvad der faktisk ligger i køen og af maxPerRun. Har kanalen aldrig postet,
 * starter vi med ét — første opslag skal ikke udløse en byge.
 */
export function postsAllowedNow(
  lastPostedAt: string | null,
  queueDepth: number,
  now: Date = new Date(),
  cfg: PacingConfig = DEFAULT_PACING,
  minutesUntilExpiry: number | null = null,
): number {
  if (queueDepth <= 0) return 0;
  if (!lastPostedAt) return 1;

  const elapsedMin = (now.getTime() - parseUtc(lastPostedAt).getTime()) / 60_000;
  const owed = Math.floor(elapsedMin / computeGapMinutes(queueDepth, cfg, minutesUntilExpiry));
  return Math.max(0, Math.min(owed, queueDepth, cfg.maxPerRun));
}

/**
 * Må der postes overhovedet? Bevaret som det spørgsmål den var, men afledt af
 * antallet — to kopier af pacing-reglen ville kunne skride fra hinanden.
 */
export function shouldPostNow(
  lastPostedAt: string | null,
  queueDepth: number,
  now: Date = new Date(),
  cfg: PacingConfig = DEFAULT_PACING,
  minutesUntilExpiry: number | null = null,
): boolean {
  return postsAllowedNow(lastPostedAt, queueDepth, now, cfg, minutesUntilExpiry) > 0;
}

/**
 * Minutter til den ældste kø-række udløber. Negativt tal betyder "allerede
 * for sent" — kalderen behandler den række som expired, men beregningen her
 * skal ikke kunne give en negativ gap.
 */
export function minutesUntilExpiry(
  oldestQueuedAt: string,
  now: Date = new Date(),
  cfg: PacingConfig = DEFAULT_PACING,
): number {
  const ageMin = (now.getTime() - parseUtc(oldestQueuedAt).getTime()) / 60_000;
  return cfg.expiryMinutes - ageMin;
}

export function isExpired(
  queuedAt: string,
  now: Date = new Date(),
  cfg: PacingConfig = DEFAULT_PACING,
): boolean {
  const ageMin = (now.getTime() - parseUtc(queuedAt).getTime()) / 60_000;
  return ageMin > cfg.expiryMinutes;
}

/**
 * AFSTAND INDEN I ÉN KØRSEL (17.-22. september 2026).
 * ===================================================
 *
 * Indhentningen fra `bfd0c29` reddede de tabte opslag, men leverede dem i
 * klumper: målt på D1 var medianafstanden mellem to britiske Bluesky-opslag
 * **0 minutter**, og 37 af 54 afstande lå under en time. Fire opslag inden for
 * fem sekunder, derefter timers stilhed. Gennemsnittet var overholdt — hvert
 * mellemrum MELLEM kørsler lå over 55 — men det er ikke det læseren ser.
 *
 * `minGapMinutes` har altid været et gennemsnit pr. kørsel, aldrig en afstand
 * mellem to opslag. Her er afstanden selv, og den koster ventetid i jobbet:
 * repoet er offentligt, så Actions-minutter er gratis, og en kørsel må gerne
 * sove. Den må bare ikke sove ind i den næste kørsel — derfor budgettet.
 */

/** Mindste afstand mellem to opslag i samme kørsel. */
export const IN_RUN_SPACING_MINUTES = 30;

/**
 * Hvor længe én kørsel må bruge på at sprede sine opslag.
 *
 * 50 minutter, ikke 60: cron'en beder om hver time, og to samtidige dræn ville
 * læse den samme «sidst postet» og sende oven i hinanden — præcis den klumpning
 * det her skal fjerne.
 */
export const RUN_BUDGET_MINUTES = 50;

/**
 * Hvor mange opslag når vi at sprede inden for budgettet?
 *
 * Det første koster ingen ventetid; hvert følgende koster `spacing`.
 */
export function postsFittingInRun(
  allowed: number,
  spacingMinutes: number = IN_RUN_SPACING_MINUTES,
  budgetMinutes: number = RUN_BUDGET_MINUTES,
): number {
  if (allowed <= 0) return 0;
  if (spacingMinutes <= 0) return allowed;
  return Math.min(allowed, 1 + Math.floor(budgetMinutes / spacingMinutes));
}

/**
 * Ville afstanden koste os opslag?
 *
 * Deadline-budgettet i `computeGapMinutes` må kun stramme, aldrig løsne — og
 * det samme gælder her, bare omvendt: er der ikke tid til at sprede køen inden
 * den ældste udløber, er et klumpet opslag stadig bedre end et tabt. Det var
 * hele lektien fra 4. september, hvor 6 artikler udløb med `attempts = 0`.
 */
export function spacingWouldCostPosts(
  queueDepth: number,
  minutesUntilExpiry: number | null,
  spacingMinutes: number = IN_RUN_SPACING_MINUTES,
): boolean {
  if (minutesUntilExpiry === null) return false;
  return queueDepth * spacingMinutes > minutesUntilExpiry;
}
