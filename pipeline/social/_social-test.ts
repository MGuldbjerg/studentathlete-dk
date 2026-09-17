/**
 * Unit-tests for social-modulets rene logik (pacing + copy).
 * Kør: npx tsx pipeline/social/_social-test.ts
 */
import { ALL_CHANNELS, cardReadyClause, distributionAllowed, profileAllowsDistribution } from "./post-social";
import { bluesky, blueskyUk, buildBlueskyRecord } from "./channels/bluesky";
import { facebook } from "./channels/facebook";
import { instagram } from "./channels/instagram";
import {
  DEFAULT_PACING,
  BLUESKY_PACING,
  pacingFor,
  computeGapMinutes,
  isExpired,
  minutesUntilExpiry,
  parseUtc,
  postsAllowedNow,
  shouldPostNow,
} from "./pacing";
import { buildPostText, truncate, withDescription } from "./copy";
import { CHANNEL_PLATFORM, ChannelAuthError } from "./types";
import { cardBlobKey, igCardBlobKey } from "../../src/lib/seo";

let passed = 0;
let failed = 0;

function expect(label: string, got: unknown, want: unknown): void {
  if (Object.is(got, want)) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}: fik ${JSON.stringify(got)}, forventede ${JSON.stringify(want)}`);
  }
}

// ── parseUtc ─────────────────────────────────────────────────────────────────
expect(
  "parseUtc: D1-format tolkes som UTC",
  parseUtc("2026-06-11 12:00:00").toISOString(),
  "2026-06-11T12:00:00.000Z",
);
expect(
  "parseUtc: ISO med Z passerer uændret",
  parseUtc("2026-06-11T12:00:00Z").toISOString(),
  "2026-06-11T12:00:00.000Z",
);

// ── computeGapMinutes (drainTarget 24t, clamp 60–180 min) ────────────────────
expect("gap: tom kø → max-gap", computeGapMinutes(0), 180);
expect("gap: 1 i kø → max-gap (24t/1 clamped til 180)", computeGapMinutes(1), 180);
expect("gap: 8 i kø → 24t/8 = 180", computeGapMinutes(8), 180);
expect("gap: 12 i kø → 120 min", computeGapMinutes(12), 120);
expect("gap: 24 i kø → 60 min", computeGapMinutes(24), 60);
expect("gap: 100 i kø → hård grænse 60 min", computeGapMinutes(100), 60);

// ── shouldPostNow ────────────────────────────────────────────────────────────
const now = new Date("2026-06-11T12:00:00Z");
expect("post: tom kø → nej", shouldPostNow(null, 0, now), false);
expect("post: aldrig postet før → ja", shouldPostNow(null, 3, now), true);
expect(
  "post: 2t siden sidst, lille kø (gap 180) → nej",
  shouldPostNow("2026-06-11 10:00:00", 3, now),
  false,
);
expect(
  "post: 3t siden sidst, lille kø (gap 180) → ja",
  shouldPostNow("2026-06-11 09:00:00", 3, now),
  true,
);
expect(
  "post: 1t siden sidst, dyb kø (gap 60) → ja",
  shouldPostNow("2026-06-11 11:00:00", 50, now),
  true,
);
expect(
  "post: 30 min siden sidst, dyb kø → nej (hård grænse)",
  shouldPostNow("2026-06-11 11:30:00", 50, now),
  false,
);

// ── deadline-budgettet: en kø der løber tør for tid, skynder sig ─────────────
expect(
  "deadline: 6 i kø med 4t igen → hård grænse 60 min (ikke 180)",
  computeGapMinutes(6, DEFAULT_PACING, 4 * 60),
  60,
);
expect(
  "deadline: 6 i kø med 18t igen → 180 (dræn-målet er stadig strammest)",
  computeGapMinutes(6, DEFAULT_PACING, 18 * 60),
  180,
);
expect(
  "deadline: kan kun STRAMME — masser af tid ændrer intet",
  computeGapMinutes(24, DEFAULT_PACING, 48 * 60),
  computeGapMinutes(24),
);
expect(
  "deadline: udløbet allerede → negativ tid giver ikke negativ gap",
  computeGapMinutes(5, DEFAULT_PACING, -120),
  60,
);
expect(
  "deadline: ukendt (null) opfører sig som før",
  computeGapMinutes(12, DEFAULT_PACING, null),
  computeGapMinutes(12),
);
expect(
  "minutesUntilExpiry: 40t i kø → 8t igen",
  minutesUntilExpiry("2026-06-09 20:00:00", now),
  8 * 60,
);
expect(
  "minutesUntilExpiry: 50t i kø → negativt (for sent)",
  minutesUntilExpiry("2026-06-09 10:00:00", now) < 0,
  true,
);
// Genafspilningen af 4. september er hele begrundelsen: 18 britiske artikler,
// de virkelige kørselstider, 12 ud med gammel logik — 18 med deadline-budgettet.
expect(
  "deadline: sidste 3 med 3t igen → 3 skyldige i én kørsel",
  postsAllowedNow("2026-06-11 09:00:00", 3, now, DEFAULT_PACING, 3 * 60),
  3,
);

// ── postsAllowedNow: kørslen indhenter det cron'en ikke nåede ────────────────
// Baggrunden er målt, ikke gættet: 4. september lå 18 britiske artikler i kø,
// 12 kom ud, 6 udløb med attempts = 0. Cron'en fyrede 6-8 gange i døgnet, ikke
// 24, og ét opslag pr. kørsel kunne ikke nå 18 inden for 48-timersgrænsen.
expect("antal: tom kø → 0", postsAllowedNow(null, 0, now), 0);
expect("antal: aldrig postet → 1 (første opslag er ikke en byge)", postsAllowedNow(null, 9, now), 1);
expect(
  "antal: 30 min siden sidst, dyb kø (gap 60) → 0",
  postsAllowedNow("2026-06-11 11:30:00", 50, now),
  0,
);
expect(
  "antal: 1t siden sidst, dyb kø (gap 60) → 1",
  postsAllowedNow("2026-06-11 11:00:00", 50, now),
  1,
);
expect(
  "antal: 5t siden sidst, kø 18 (gap 80) → 3 skyldige",
  postsAllowedNow("2026-06-11 07:00:00", 18, now),
  3,
);
expect(
  "antal: 2 døgns stilstand → maxPerRun, ikke hele køen",
  postsAllowedNow("2026-06-09 12:00:00", 50, now),
  DEFAULT_PACING.maxPerRun,
);
expect(
  "antal: kø-dybden er også et loft",
  postsAllowedNow("2026-06-09 12:00:00", 2, now),
  2,
);
expect(
  "antal: maxPerRun × målt kadence (6 kørsler) rammer den hårde 24/døgn",
  DEFAULT_PACING.maxPerRun * 6 <= (24 * 60) / DEFAULT_PACING.minGapMinutes,
  true,
);
// shouldPostNow er nu afledt af antallet — samme svar, én regel.
expect(
  "afledt: shouldPostNow følger postsAllowedNow (ja)",
  shouldPostNow("2026-06-11 07:00:00", 18, now),
  postsAllowedNow("2026-06-11 07:00:00", 18, now) > 0,
);
expect(
  "afledt: shouldPostNow følger postsAllowedNow (nej)",
  shouldPostNow("2026-06-11 11:30:00", 50, now),
  postsAllowedNow("2026-06-11 11:30:00", 50, now) > 0,
);

// ── isExpired (48t) ──────────────────────────────────────────────────────────
expect("expiry: 47t i kø → frisk", isExpired("2026-06-09 13:00:00", now), false);
expect("expiry: 49t i kø → udløbet", isExpired("2026-06-09 11:00:00", now), true);

// ── truncate ─────────────────────────────────────────────────────────────────
expect("truncate: kort tekst urørt", truncate("Hej verden", 50), "Hej verden");
const long = "a".repeat(10) + " " + "b".repeat(300);
expect("truncate: overholder max", [...truncate(long, 100)].length <= 100, true);
expect("truncate: ender med ellipse", truncate(long, 100).endsWith("…"), true);

// ── buildPostText ────────────────────────────────────────────────────────────
const input = {
  title: "Emma Hansen scorer hattrick i sæsonpremieren",
  description: "Den danske angriber viste klassen fra start.",
  url: "https://studentathlete.dk/fodbold/emma-hansen-hattrick",
  lang: "da",
};
// Bluesky bar før KUN titlen, ud fra at embed-kortet viste resten. Men kortet
// er ikke garanteret — thumb-uploaden kan fejle, og Facebooks scrape har været
// tom før — så opslaget skal kunne læses uden det.
expect(
  "copy: bluesky = titel + beskrivelse",
  buildPostText(input, "bluesky"),
  `${input.title}\n\n${input.description}`,
);
expect(
  "copy: bluesky uden beskrivelse = ren titel",
  buildPostText({ ...input, description: null }, "bluesky"),
  input.title,
);
expect(
  "copy: bluesky holder 300 tegn med lang beskrivelse",
  [...buildPostText({ ...input, description: "x".repeat(500) }, "bluesky")].length <= 300,
  true,
);

// ── withDescription: titlen vinder, og stumper udelades ──────────────────────
expect("fit: kort titel + beskrivelse", withDescription("Titel", "Beskrivelse", 100), `Titel\n\nBeskrivelse`);
expect("fit: ingen beskrivelse → kun titel", withDescription("Titel", null, 100), "Titel");
// Under 40 tegn tilbage er en stump af en sætning støj, ikke information.
expect(
  "fit: for lidt plads → beskrivelsen udelades helt",
  withDescription("t".repeat(70), "en beskrivelse der ikke er plads til", 100),
  "t".repeat(70),
);
expect(
  "fit: titlen klippes kun hvis den alene sprænger budgettet",
  [...withDescription("t".repeat(200), "beskrivelse", 100)].length <= 100,
  true,
);
expect(
  "copy: x = titel + link",
  buildPostText(input, "x"),
  `${input.title}\n\n${input.url}`,
);
expect(
  "copy: facebook = titel + ingress (link sendes separat)",
  buildPostText(input, "facebook"),
  `${input.title}\n\n${input.description}`,
);
expect(
  "copy: facebook uden ingress = kun titel",
  buildPostText({ ...input, description: null }, "facebook"),
  input.title,
);
// ── Instagram-captionen ──────────────────────────────────────────────────────
// To ting adskiller den fra de andre: links er IKKE klikbare i en IG-caption,
// og teksten skal være på artiklens sprog. Det sidste er ikke teori — kortet
// sagde «mod Brown» på britiske artikler indtil 2026-09-14, fordi en sprogværdi
// havde en dansk standard. Derfor er `lang` påkrævet, og derfor testes begge.
const igDa = buildPostText(input, "instagram");
const igEn = buildPostText({ ...input, lang: "en" }, "instagram");
expect("ig: dansk caption henviser til bio", igDa.includes("link i bio"), true);
expect("ig: engelsk caption henviser til bio", igEn.includes("link in bio"), true);
expect("ig: dansk og engelsk er IKKE ens", igDa === igEn, false);
expect("ig: URL står ikke i captionen (links er døde dér)", igDa.includes(input.url), false);
expect("ig: titlen er med", igDa.includes(input.title), true);
expect("ig: ingressen er med", igDa.includes(input.description), true);
expect("ig: holder sig under Instagrams 2.200 tegn", [...igDa].length <= 2200, true);
// Bio-linjen får sin plads reserveret FØR teksten fylder resten, så den aldrig
// kan blive klippet væk af en lang beskrivelse.
const igLang = buildPostText({ ...input, description: "x".repeat(4000) }, "instagram");
expect("ig: bio-linjen overlever en meget lang beskrivelse", igLang.includes("link i bio"), true);
expect("ig: og captionen holder stadig grænsen", [...igLang].length <= 2200, true);

// ── Kanalen kræver sit EGET kort ─────────────────────────────────────────────
// Ventede Instagram på delekortet, ville den poste med et billede der ikke
// findes endnu — og Meta cacher sin egen hentning af image_url.
expect("instagram bruger ig-kortet", instagram.cardKind, "ig");
expect("facebook bruger delekortet", facebook.cardKind, "share");
expect("bluesky bruger delekortet", bluesky.cardKind, "share");
// Bind SQL'en til nøglefunktionen ved at SPLITTE en rigtig nøgle om id'et:
// "ig-7-v9" → præfiks "ig-" og hale "-v9". Begge dele skal stå i klausulen,
// så et versionsbump eller et omdøbt præfiks ikke kan skride fra hinanden.
for (const [kind, keyOf] of [
  ["ig", igCardBlobKey],
  ["share", cardBlobKey],
] as const) {
  const [prefix, suffix] = keyOf(7).split("7");
  const clause = cardReadyClause("a", kind);
  expect(`SQL (${kind}): samme præfiks som nøglefunktionen`, clause.includes(`'${prefix}'`), true);
  expect(`SQL (${kind}): samme version som nøglefunktionen`, clause.includes(suffix), true);
}
expect(
  "de to klar-betingelser er ikke ens",
  cardReadyClause("a", "ig") === cardReadyClause("a", "share"),
  false,
);
expect("instagram er en dansk konto", instagram.country, "DK");
expect("instagram uden secrets er ukonfigureret", instagram.isConfigured(), false);

const longTitle = { ...input, title: "x".repeat(400) };
expect(
  "copy: bluesky-titel klippes til 300",
  [...buildPostText(longTitle, "bluesky")].length <= 300,
  true,
);
expect(
  "copy: x-titel klippes så titel+link holder sig under 280",
  [...buildPostText(longTitle, "x")].length <= 250 + 2 + longTitle.url.length,
  true,
);

// ── DEFAULT_PACING sanity ────────────────────────────────────────────────────
expect("config: hård grænse er 1/time", DEFAULT_PACING.minGapMinutes, 60);
expect("config: expiry 48t", DEFAULT_PACING.expiryMinutes, 48 * 60);


// ── Distribution pr. land (hændelsen 2026-08-05) ─────────────────────────────
// Den danske Facebook-side og Bluesky-konto postede en BRITISK artikel, midt i
// UK-sitets dark launch. To ting manglede: kanalen kendte ikke sit land, og
// dark launch spærrede kun for søgemaskiner — ikke for distribution.
expect("kanal: bluesky er en dansk konto", bluesky.country, "DK");
expect("kanal: facebook er en dansk konto", facebook.country, "DK");
expect("distribution: DK er tilladt", distributionAllowed("DK"), true);
expect("distribution: dark launch spærrer", profileAllowsDistribution({ darkLaunch: true }), false);
expect("distribution: uden flag er distribution tilladt", profileAllowsDistribution({}), true);
expect("distribution: UK er ikke længere dark launch (21/8)", distributionAllowed("UK"), true);
expect("distribution: ukendt land falder tilbage på standardsitet", distributionAllowed("ZZ"), true);

// ── Én konto pr. land (britisk Bluesky-konto, 2026-08-31) ────────────────────
// Kanalen er en KONTO. To konti på samme platform må hverken dele kø-navn,
// secrets eller sprog — det er de tre steder det britiske site ellers ville
// falde tilbage på det danske.
expect("kanal: bluesky_uk er en britisk konto", blueskyUk.country, "UK");
expect("kanal: bluesky_uk har sit eget kø-navn", blueskyUk.name, "bluesky_uk");
expect("kanal: kø-navne er unikke", new Set(ALL_CHANNELS.map((c) => c.name)).size, ALL_CHANNELS.length);
expect("kanal: bluesky_uk kører på bluesky-platformen", CHANNEL_PLATFORM["bluesky_uk"], "bluesky");
expect(
  "copy: bluesky_uk skriver som bluesky (platformen, ikke kontoen)",
  buildPostText(input, "bluesky_uk"),
  buildPostText(input, "bluesky"),
);

// Sproget følger landeprofilen. Et engelsk opslag mærket "da" skjules af
// Blueskys sprogfilter for præcis de læsere det er skrevet til.
const sampleContent = {
  text: "Titel",
  url: "https://student-athlete.co.uk/x",
  title: "Titel",
  summary: null,
  imageUrl: "https://student-athlete.co.uk/i.png",
};
expect("bluesky: dansk opslag mærkes da", buildBlueskyRecord(sampleContent, "DK").langs[0], "da");
expect("bluesky: britisk opslag mærkes en", buildBlueskyRecord(sampleContent, "UK").langs[0], "en");

// Secrets må ikke kunne smitte af: står kun de danske i miljøet, er den
// britiske konto UKONFIGURERET — ellers ville den poste som @studentathlete.dk.
const savedEnv = {
  dk: process.env.BLUESKY_HANDLE,
  dkPw: process.env.BLUESKY_APP_PASSWORD,
  uk: process.env.BLUESKY_UK_HANDLE,
  ukPw: process.env.BLUESKY_UK_APP_PASSWORD,
};
process.env.BLUESKY_HANDLE = "studentathlete.dk";
process.env.BLUESKY_APP_PASSWORD = "x";
delete process.env.BLUESKY_UK_HANDLE;
delete process.env.BLUESKY_UK_APP_PASSWORD;
expect("secrets: dansk konto konfigureret", bluesky.isConfigured(), true);
expect("secrets: britisk konto arver ikke de danske", blueskyUk.isConfigured(), false);
for (const [k, v] of Object.entries({
  BLUESKY_HANDLE: savedEnv.dk,
  BLUESKY_APP_PASSWORD: savedEnv.dkPw,
  BLUESKY_UK_HANDLE: savedEnv.uk,
  BLUESKY_UK_APP_PASSWORD: savedEnv.ukPw,
})) {
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

// ── Kort før opslag (Amtrup 2026-08-18, #108 2026-08-20) ─────────────────────
// Begge opslag gik ud FØR artiklens 1200×630-kort var rendret, fik /api/og's
// 600×315-fallback i stedet — mens siden lovede 1200 — og endte uden billede på
// Facebook. Køen spørger nu efter kortet, og nøglen i SQL'en SKAL være den
// samme som `cardBlobKey()` bygger; ellers venter køen på et kort der aldrig
// findes, eller poster et der ikke er der.
expect(
  "kort-gate: SQL'ens nøgle matcher cardBlobKey",
  cardReadyClause("a").includes(`'${cardBlobKey(42).replace("42", "' || a.id || '")}'`),
  true,
);
expect(
  "kort-gate: alias bruges (så klausulen kan genbruges)",
  cardReadyClause("x").includes("x.id"),
  true,
);

// Asynkrone tests til sidst: tsx bygger CJS, så top-level await findes ikke.
void (async () => {
  // ── Login-fejl må ikke koste kø-rækker (31/8: UK-handlen skiftede) ───────────
  // Den britiske konto skiftede handle til sit domæne; secret'en pegede stadig på
  // det gamle *.bsky.social. Køen tolkede 401'eren som "artiklen fejlede" og
  // begyndte at tælle forsøg — tre timer pr. artikel, så ville de 7 ventende
  // være markeret `failed` inden næste morgen. Fejltypen adskiller nu KONTO fra
  // OPSLAG; kø-rækken røres ikke ved en konto-fejl.
  const realFetch = globalThis.fetch;
  function stubFetch(handler: (url: string) => { ok: boolean; status: number; body: unknown }) {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const r = handler(String(input));
      return {
        ok: r.ok,
        status: r.status,
        headers: new Map([["content-type", "application/json"]]),
        json: async () => r.body,
        text: async () => JSON.stringify(r.body),
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as Response;
    }) as typeof fetch;
  }

  process.env.BLUESKY_UK_HANDLE = "student-athlete.co.uk";
  process.env.BLUESKY_UK_APP_PASSWORD = "forkert";
  const content = {
    text: "T", url: "https://student-athlete.co.uk/x", title: "T", summary: null,
    imageUrl: "https://student-athlete.co.uk/i.png",
  };

  stubFetch((url) =>
    url.includes("createSession")
      ? { ok: false, status: 401, body: { error: "AuthenticationRequired" } }
      : { ok: true, status: 200, body: {} },
  );
  let caught: unknown = null;
  try {
    await blueskyUk.post(content);
  } catch (e) {
    caught = e;
  }
  expect("login-fejl er en KONTO-fejl", caught instanceof ChannelAuthError, true);

  // Modstykket: en fejl i selve opslaget SKAL tælle som et forsøg.
  stubFetch((url) => {
    if (url.includes("createSession")) {
      return { ok: true, status: 200, body: { accessJwt: "j", did: "did:plc:x", handle: "h" } };
    }
    if (url.includes("createRecord")) return { ok: false, status: 500, body: { error: "upstream" } };
    return { ok: false, status: 404, body: {} }; // thumb-hentning fejler → intet kort
  });
  caught = null;
  try {
    await blueskyUk.post(content);
  } catch (e) {
    caught = e;
  }
  expect("opslags-fejl er IKKE en konto-fejl", caught instanceof ChannelAuthError, false);
  expect("opslags-fejl er stadig en fejl", caught instanceof Error, true);
  globalThis.fetch = realFetch;
  delete process.env.BLUESKY_UK_HANDLE;
  delete process.env.BLUESKY_UK_APP_PASSWORD;

  console.log(`\n${passed} bestået, ${failed} fejlet`);
  if (failed > 0) process.exit(1);
})();

// ── Bluesky pacer tættere end Meta-kanalerne (2026-09-17) ───────────────────
expect("bluesky har sin egen pacing", pacingFor("bluesky").maxGapMinutes, 55);
expect("bluesky_uk deler den", pacingFor("bluesky_uk").maxGapMinutes, 55);
expect("facebook rører sig ikke", pacingFor("facebook").maxGapMinutes, 180);
expect("instagram rører sig ikke", pacingFor("instagram").maxGapMinutes, 180);
expect("ukendt kanal falder tilbage på DEFAULT", pacingFor("threads").maxGapMinutes, 180);

// Gulvet SKAL flytte med loftet: var minGap blevet stående på 60, ville
// computeGapMinutes regne max(60, raw) og derefter min(55, …) = konstant 55,
// og pacingen holdt op med at være adaptiv.
expect("gulv og loft følges ad", BLUESKY_PACING.minGapMinutes, 55);
expect(
  "en lille kø får 55, ikke 180",
  computeGapMinutes(1, BLUESKY_PACING, null),
  55,
);
expect(
  "en dyb kø kan ikke komme under 55",
  computeGapMinutes(200, BLUESKY_PACING, 60),
  55,
);
// Dagsloftet stiger fra 24 til ~26 opslag/døgn. Indhentningen må stadig ikke
// kunne overskride det på den målte kadence (~6 kørsler i døgnet).
expect(
  "indhentning sprænger ikke det nye dagsloft",
  BLUESKY_PACING.maxPerRun * 6 <= (24 * 60) / BLUESKY_PACING.minGapMinutes,
  true,
);
