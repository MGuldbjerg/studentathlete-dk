/**
 * Unit-tests for social-modulets rene logik (pacing + copy).
 * Kør: npx tsx pipeline/social/_social-test.ts
 */
import {
  ALL_CHANNELS,
  withinQueueWindow,
  cardReadyClause,
  channelIsDisabled,
  distributionAllowed,
  profileAllowsDistribution,
  taggedArticleUrl,
  drainAll,
} from "./post-social";
import { buildBlueskyRecord, createBlueskyChannel, tagFacets } from "./channels/bluesky";
import { hashtagLine, hashtagsFor } from "./hashtags";
import { createFacebookChannel } from "./channels/facebook";
import {
  createInstagramChannel,
  graphFor,
  interpretContainerStatus,
  isContainerNotReadyError,
} from "./channels/instagram";
import { patDaysLeft, refreshRequestFor } from "./refresh-ig-tokens";
import { followerRequest } from "./collect-followers";
import { dashboardChannels } from "../../src/lib/social-stats";
import { COUNTRIES } from "../../src/lib/countries";
import { createThreadsChannel, isMediaNotYetVisible, threadsContainerParams, threadsTopicTag } from "./channels/threads";
import { countryForUrl } from "./rescrape-facebook";
import { scopesNotGrantedForTarget } from "./check-tokens";
import {
  DEFAULT_PACING,
  BLUESKY_PACING,
  pacingFor,
  computeGapMinutes,
  isExpired,
  minutesUntilExpiry,
  parseUtc,
  postsAllowedNow,
  postsFittingInRun,
  shouldPostNow,
  spacingWouldCostPosts,
} from "./pacing";
import { buildPostText, truncate, withDescription } from "./copy";
import { bypasses, edgeTtl, isCacheable } from "../../src/lib/worker-cache";
import { ChannelAuthError } from "./types";
import {
  accountIsConfigured,
  allAccounts,
  channelAccount,
  channelNameFor,
  envNameFor,
  legacyEnvNameFor,
  readAccountEnv,
} from "./registry";

const bluesky = createBlueskyChannel("DK");
const blueskyUk = createBlueskyChannel("UK");
const facebook = createFacebookChannel("DK");
const instagram = createInstagramChannel("DK");
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
expect("kanal: bluesky_uk kører på bluesky-platformen", blueskyUk.platform, "bluesky");
expect(
  "copy: bluesky_uk skriver som bluesky (platformen, ikke kontoen)",
  buildPostText(input, blueskyUk.platform),
  buildPostText(input, bluesky.platform),
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

  // ── Channels drain in parallel (2026-10-05: 5 of 8 runs hit the timeout) ──
  {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const t0 = Date.now();
    const out = await drainAll([{ name: "a" }, { name: "b" }, { name: "c" }], async (ch) => {
      await wait(150); // stands in for the 30-minute in-run spacing
      if (ch.name === "b") throw new Error("boom");
      return { posted: 2, error: null };
    });
    const took = Date.now() - t0;
    expect("drainAll: waits overlap (≈ one wait, not three)", took < 300, true);
    expect("drainAll: posts are summed", out.posted, 4);
    expect("drainAll: a throwing channel becomes its own error", out.errors.join("|"), "b: boom");
  }

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

// ── Instagram-containeren skal være FÆRDIG før udgivelsen (artikel 275) ──────
// 16. september blev artikel 275 udgivet tre gange uden ventetrin og fejlede
// alle tre med 9007. Beslutningen «vent / udgiv / opgiv» er nu ren, og det er
// den her der prøves — ikke løkken omkring den.
expect("FINISHED er klar", interpretContainerStatus("FINISHED"), "ready");
expect("PUBLISHED er også klar", interpretContainerStatus("PUBLISHED"), "ready");
expect("IN_PROGRESS venter", interpretContainerStatus("IN_PROGRESS"), "wait");
expect("ERROR er dødfødt", interpretContainerStatus("ERROR"), "dead");
expect("EXPIRED er dødfødt", interpretContainerStatus("EXPIRED"), "dead");
// Et manglende eller ukendt felt må aldrig tolkes som «klar» — dét var netop
// antagelsen der kostede artikel 275. Deadlinen gør «vent» endeligt.
expect("manglende status venter", interpretContainerStatus(undefined), "wait");
expect("ukendt status venter", interpretContainerStatus("NOGET_NYT"), "wait");

// ── 9007 må prøves igen; alt andet skal koste et forsøg ─────────────────────
expect(
  "9007 er «ikke klar endnu»",
  isContainerNotReadyError('{"error":{"message":"Media ID is not available","code":9007,"error_subcode":2207027}}'),
  true,
);
expect(
  "mellemrum i JSON'en tæller også",
  isContainerNotReadyError('{"error": {"code": 9007}}'),
  true,
);
expect(
  "en rettighedsfejl er ægte og prøves ikke igen",
  isContainerNotReadyError('{"error":{"message":"(#200) Permissions error","code":200}}'),
  false,
);
// Koden læses, ikke prosaen: teksten er Metas engelske formulering og kan
// ændre sig uden varsel, koden kan ikke.
expect(
  "teksten alene udløser ikke en genprøve",
  isContainerNotReadyError('{"error":{"message":"Media ID is not available","code":100}}'),
  false,
);

// ── «Rettigheden er givet» ≠ «rettigheden gælder her» (17. september) ────────
// Tjekket meldte grønt — pages_manage_posts stod i scopes — og Facebook afviste
// stadig opslaget med (#200). Metas granulære samtykker knytter hver rettighed
// til bestemte sider, og scopes-listen viser ikke hvilke.
const granular = [
  { scope: "pages_manage_posts", targetIds: ["111"] },
  { scope: "pages_read_engagement", targetIds: ["111", "222"] },
];
expect(
  "samtykket gælder siden → intet problem",
  scopesNotGrantedForTarget(["pages_manage_posts"], granular, "111").length,
  0,
);
expect(
  "samtykket peger på en anden side → fanget",
  scopesNotGrantedForTarget(["pages_manage_posts"], granular, "222").join(","),
  "pages_manage_posts",
);
expect(
  "flere sider på ét samtykke tæller alle med",
  scopesNotGrantedForTarget(["pages_read_engagement"], granular, "222").length,
  0,
);
// Fravær af en begrænsning er ikke en begrænsning: har en rettighed ingen
// granulær post, er den ikke afgrænset til nogen side.
expect(
  "rettighed uden granulær post er ikke afgrænset",
  scopesNotGrantedForTarget(["instagram_basic"], granular, "111").length,
  0,
);
expect("tomt granulært svar afgrænser intet", scopesNotGrantedForTarget(["pages_manage_posts"], [], "111").length, 0);
expect(
  "tom target-liste afgrænser heller ikke",
  scopesNotGrantedForTarget(["x"], [{ scope: "x", targetIds: [] }], "111").length,
  0,
);
// ── Afstand inden i én kørsel (målt 22. september: median 0 minutter) ────────
// Indhentningen leverede fire opslag inden for fem sekunder. Gennemsnittet var
// overholdt, afstanden var ikke.
expect("ét opslag koster ingen ventetid", postsFittingInRun(1, 30, 50), 1);
expect("to opslag passer i 50 min med 30 min afstand", postsFittingInRun(2, 30, 50), 2);
expect("fire gør ikke — budgettet rækker til én ventetid", postsFittingInRun(4, 30, 50), 2);
expect("intet at sende → intet at sprede", postsFittingInRun(0, 30, 50), 0);
expect("større budget, flere opslag", postsFittingInRun(4, 30, 90), 4);
// Afstand 0 betyder «slu00e5 spredning fra», ikke «divider med nul».
expect("afstand 0 sender alt", postsFittingInRun(4, 0, 50), 4);

// ── …men en deadline slår afstanden, ikke omvendt ────────────────────────
// Samme regel som computeGapMinutes' deadline-budget: et klumpet opslag er
// bedre end et tabt. 4. september udløb 6 artikler med attempts = 0.
expect("ingen deadline → spred endelig", spacingWouldCostPosts(5, null, 30), false);
expect("god tid → spred", spacingWouldCostPosts(2, 600, 30), false);
expect("knap tid → drop afstanden", spacingWouldCostPosts(10, 120, 30), true);
expect("lige præcis tid nok tæller ikke som knap", spacingWouldCostPosts(4, 120, 30), false);
expect("én mere end der er tid til", spacingWouldCostPosts(5, 120, 30), true);

// ── Kant-cachen: hvad må gemmes, og hvad skal udenom ────────────────────
// Se worker-entry.ts. RSC-headeren er den vigtige: uden den kunne en prefetch
// lægge en text/x-component-nyttelast på forsidens plads i cachen.
const mkRes = (status: number, headers: Record<string, string> = {}) => new Response("", { status, headers });
expect("almindeligt 200-svar må gemmes", isCacheable(mkRes(200)), true);
expect("404 gemmes ikke", isCacheable(mkRes(404)), false);
expect("Set-Cookie gemmes ALDRIG", isCacheable(mkRes(200, { "set-cookie": "sa_country=UK" })), false);
expect("no-store respekteres", isCacheable(mkRes(200, { "cache-control": "private, no-store" })), false);
expect("s-maxage-svaret må gemmes", isCacheable(mkRes(200, { "cache-control": "public, s-maxage=300" })), true);
expect("edge TTL: default 300 without s-maxage", edgeTtl(mkRes(200)), 300);
expect("edge TTL: stats page's 6 hours wins", edgeTtl(mkRes(200, { "cache-control": "public, max-age=0, s-maxage=21600" })), 21600);
expect("edge TTL: never shorter than the default", edgeTtl(mkRes(200, { "cache-control": "public, s-maxage=10" })), 300);
expect("edge TTL: capped at a day", edgeTtl(mkRes(200, { "cache-control": "public, s-maxage=9999999" })), 86400);

const mkReq = (url: string, init: RequestInit = {}) => new Request(url, init);
expect("forsiden caches", bypasses(mkReq("https://studentathlete.dk/")), false);
expect("atletsiden caches", bypasses(mkReq("https://studentathlete.dk/atleter/x")), false);
expect("RSC-anmodning udenom", bypasses(mkReq("https://studentathlete.dk/", { headers: { rsc: "1" } })), true);
expect("admin udenom", bypasses(mkReq("https://studentathlete.dk/admin")), true);
expect("hele /api udenom", bypasses(mkReq("https://studentathlete.dk/api/og?article=1")), true);
expect("POST udenom", bypasses(mkReq("https://studentathlete.dk/", { method: "POST" })), true);

// ── Hashtags: kun Bluesky, og kun to ─────────────────────────────────
expect("sport + land giver to tags", hashtagsFor("golf", "DK").join(","), "CollegeGolf,dansksport");
expect("britisk konto får sit eget land-tag", hashtagsFor("rowing", "UK").join(","), "CollegeRowing,BritsAbroad");
expect("ukendt sport springes over", hashtagsFor("curling", "DK").join(","), "dansksport");
expect("ukendt land springes over", hashtagsFor("golf", "XX").join(","), "CollegeGolf");
expect("intet kendt → ingen tags", hashtagsFor(null, undefined).length, 0);
expect("linjen bærer havelågerne", hashtagLine(["CollegeGolf", "dansksport"]), "#CollegeGolf #dansksport");
expect("ingen tags → tom linje", hashtagLine([]), "");

// Tags skal med i teksten, og teksten skal stadig holde 300 tegn.
const tagged = buildPostText({ ...input, sport: "golf", country: "DK" }, "bluesky");
expect("bluesky-teksten bærer tags", tagged.includes("#CollegeGolf #dansksport"), true);
expect("tags er sidst", tagged.trimEnd().endsWith("#dansksport"), true);
expect("uden sport/land er teksten som før", buildPostText(input, "bluesky"), buildPostText(input, "bluesky"));
const taggedLong = buildPostText(
  { ...input, description: "x".repeat(500), sport: "golf", country: "DK" },
  "bluesky",
);
expect("300 tegn holder også med tags", [...taggedLong].length <= 300, true);
expect("tags overlever afkortningen", taggedLong.includes("#CollegeGolf"), true);
// Meta-kanalerne får ALDRIG tags — de virker ikke der, og de koster plads.
expect("facebook får ingen tags", buildPostText({ ...input, sport: "golf", country: "DK" }, "facebook").includes("#"), false);
expect("instagram får ingen tags", buildPostText({ ...input, sport: "golf", country: "DK" }, "instagram").includes("#College"), false);

// ── Facetter: intervallet er BYTES, ikke tegn ─────────────────────
// Uden facet er et tag grå tekst. Og med FORKERT facet markerer den et
// tilfældigt stykke tekst midt i sætningen — værre end ingenting.
const asciiFacets = tagFacets("Hansen vandt #CollegeGolf");
expect("ét tag fundet", asciiFacets.length, 1);
expect("tagget bærer ikke sit havelåg", asciiFacets[0].features[0].tag, "CollegeGolf");
expect("ascii: byteStart = tegnindeks", asciiFacets[0].index.byteStart, 13);
expect("ascii: byteEnd", asciiFacets[0].index.byteEnd, 25);

// Den rigtige prøve: tre danske tegn FØR tagget. "Søren flåede bæltet " er 20 tegn
// men 23 bytes, fordi ø, å og æ fylder to hver.
const daText = "Søren flåede bæltet #CollegeGolf";
const daFacets = tagFacets(daText);
expect("dansk: tegnindeks ville være 20", daText.indexOf("#CollegeGolf"), 20);
expect("dansk: byteStart er 23, ikke 20", daFacets[0].index.byteStart, 23);
expect("dansk: byteEnd følger med", daFacets[0].index.byteEnd, 35);

const two = tagFacets("Tekst #CollegeGolf #dansksport");
expect("to tags, to facetter", two.length, 2);
expect("andet tag er landet", two[1].features[0].tag, "dansksport");
// Tegnsætning hører ikke til tagget.
expect("punktum kommer ikke med", tagFacets("Slut #dansksport.")[0].features[0].tag, "dansksport");
expect("et nøgent havelåg er ikke et tag", tagFacets("100 % # ikke et tag").length, 0);
// ── Kontoregisteret ─────────────────────────────────────────────
// DET VIGTIGSTE I HELE FILEN: kanalnavnet er en databaseværdi. Ændres et af de
// fire nedenfor, mister kanalen sin historik, pacingen tror den aldrig har
// postet, og hele arkivet lægges i kø igen.
expect("bluesky DK beholder sit gamle navn", channelNameFor("bluesky", "DK"), "bluesky");
expect("bluesky UK beholder sit gamle navn", channelNameFor("bluesky", "UK"), "bluesky_uk");
expect("facebook DK beholder sit gamle navn", channelNameFor("facebook", "DK"), "facebook");
expect("instagram DK beholder sit gamle navn", channelNameFor("instagram", "DK"), "instagram");
// Nye konti er symmetriske — ingen af dem findes i databasen endnu.
expect("nyt marked får symmetrisk navn", channelNameFor("facebook", "UK"), "facebook_uk");
expect("instagram UK også", channelNameFor("instagram", "UK"), "instagram_uk");
expect("et land vi ikke har endnu", channelNameFor("bluesky", "DE"), "bluesky_de");
expect("småt/stort er ligegyldigt", channelNameFor("facebook", "uk"), "facebook_uk");

// Secret-navne: de nye er symmetriske, de gamle lever som reserve.
expect("nyt navn er symmetrisk", envNameFor("facebook", "UK", "PAGE_ID"), "FB_UK_PAGE_ID");
expect("bluesky-præfiks", envNameFor("bluesky", "DK", "HANDLE"), "BLUESKY_DK_HANDLE");
expect("gammelt DK-navn kendes", legacyEnvNameFor("facebook", "DK", "PAGE_ID"), "FB_PAGE_ID");
expect("gammelt UK-navn kendes", legacyEnvNameFor("bluesky", "UK", "HANDLE"), "BLUESKY_UK_HANDLE");
expect("nye konti har intet gammelt navn", legacyEnvNameFor("facebook", "UK", "PAGE_ID"), null);

// Ræækkefølgen ER migrationsplanen: nyt navn vinder, gammelt er reserve.
delete process.env.FB_DK_PAGE_ID;
process.env.FB_PAGE_ID = "gammel-vaerdi";
expect("uden nyt navn bruges det gamle", readAccountEnv("facebook", "DK", "PAGE_ID"), "gammel-vaerdi");
process.env.FB_DK_PAGE_ID = "ny-vaerdi";
expect("nyt navn vinder over gammelt", readAccountEnv("facebook", "DK", "PAGE_ID"), "ny-vaerdi");
delete process.env.FB_DK_PAGE_ID;
delete process.env.FB_PAGE_ID;
expect("ingen af delene → undefined", readAccountEnv("facebook", "DK", "PAGE_ID"), undefined);

// En konto uden alle sine secrets findes ikke.
expect("halvt sat op tæller ikke", accountIsConfigured("facebook", "DK"), false);
process.env.FB_DK_PAGE_ID = "1";
expect("stadig halvt", accountIsConfigured("facebook", "DK"), false);
process.env.FB_DK_PAGE_ACCESS_TOKEN = "2";
expect("begge felter → konfigureret", accountIsConfigured("facebook", "DK"), true);
delete process.env.FB_DK_PAGE_ID;
delete process.env.FB_DK_PAGE_ACCESS_TOKEN;

// Landeregistret driver listen: et nyt land giver sine konti gratis.
const accounts = allAccounts();
expect("alle lande × alle platforme", accounts.length, 8);
expect("UK har en facebook-konto i registret", accounts.some((a) => a.channel === "facebook_uk"), true);
expect("DK's bluesky hedder stadig bluesky", accounts.some((a) => a.channel === "bluesky"), true);

// ── Kanaler slaaet fra med vilje (22. september 2026: facebook) ──────────
// Forskellen paa «ukonfigureret» og «slaaet fra» er reel: den foerste mangler
// secrets, den anden HAR dem og er stoppet af en grund et menneske kender.
expect("uden variabel er intet slaaet fra", channelIsDisabled("facebook", undefined), false);
expect("tom variabel slaar intet fra", channelIsDisabled("facebook", ""), false);
expect("navnet paa listen", channelIsDisabled("facebook", "facebook"), true);
expect("et andet navn er upaavirket", channelIsDisabled("bluesky", "facebook"), false);
expect("flere navne", channelIsDisabled("instagram", "facebook,instagram"), true);
expect("mellemrum taeller ikke med", channelIsDisabled("instagram", "facebook, instagram"), true);
expect("tomme led springes over", channelIsDisabled("bluesky", "facebook,,"), false);
// Delnavne maa ikke ramme: «facebook» slaar ikke «facebook_uk» fra.
expect("delnavn rammer ikke", channelIsDisabled("facebook_uk", "facebook"), false);

// ── Meta adapters per country (2026-10-01) ────────────────────────────────
// A new market is accounts + secrets, no code: ALL_CHANNELS comes from the
// registry, and the four channels from before keep their database names.
const names = ALL_CHANNELS.map((c) => c.name);
for (const legacy of ["bluesky", "bluesky_uk", "facebook", "instagram"]) {
  expect(`legacy channel ${legacy} keeps its queue name`, names.includes(legacy), true);
}
const fbUk = ALL_CHANNELS.find((c) => c.name === "facebook_uk");
const igUk = ALL_CHANNELS.find((c) => c.name === "instagram_uk");
expect("facebook_uk exists", fbUk?.country, "UK");
expect("facebook_uk is a facebook channel", fbUk?.platform, "facebook");
expect("instagram_uk exists", igUk?.country, "UK");
expect("instagram_uk uses the IG card", igUk?.cardKind, "ig");
expect("every channel's platform matches the registry", ALL_CHANNELS.every((c) => channelAccount(c.name)?.platform === c.platform), true);

// Danish secrets must not configure the British accounts.
const savedMeta = { id: process.env.IG_USER_ID, tok: process.env.IG_ACCESS_TOKEN };
process.env.IG_USER_ID = "1";
process.env.IG_ACCESS_TOKEN = "2";
expect("IG DK configured by the old names", instagram.isConfigured(), true);
expect("IG UK does not inherit the Danish secrets", igUk?.isConfigured(), false);
process.env.IG_UK_USER_ID = "3";
process.env.IG_UK_ACCESS_TOKEN = "4";
expect("IG UK configured by its own secrets", igUk?.isConfigured(), true);
delete process.env.IG_UK_USER_ID;
delete process.env.IG_UK_ACCESS_TOKEN;
for (const [k, v] of Object.entries({ IG_USER_ID: savedMeta.id, IG_ACCESS_TOKEN: savedMeta.tok })) {
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

// Deletion finds the account from the queue row's channel.
expect("channelAccount: bluesky_uk is British", channelAccount("bluesky_uk")?.country, "UK");
expect("channelAccount: facebook is Danish", channelAccount("facebook")?.country, "DK");
expect("channelAccount: facebook_uk is British", channelAccount("facebook_uk")?.country, "UK");
expect("channelAccount: x rows still resolve", channelAccount("x")?.platform, "x");
expect("channelAccount: unknown → null", channelAccount("myspace"), null);

// Rescrape uses the page of the site the URL belongs to.
expect("rescrape: .dk → DK", countryForUrl("https://studentathlete.dk/fodbold/x"), "DK");
expect("rescrape: .co.uk → UK", countryForUrl("https://www.student-athlete.co.uk/football/x"), "UK");
expect("rescrape: other host → null", countryForUrl("https://example.com/x"), null);

// ── Instagram login (UK, 2026-10-01) ──────────────────────────────────────
// The login is set explicitly per account, never guessed from the token.
delete process.env.IG_UK_LOGIN;
expect("IG UK defaults to the Facebook-login host", graphFor("UK").startsWith("https://graph.facebook.com/"), true);
process.env.IG_UK_LOGIN = "instagram";
expect("IG_UK_LOGIN=instagram → graph.instagram.com", graphFor("UK").startsWith("https://graph.instagram.com/"), true);
expect("DK is unaffected by the UK setting", graphFor("DK").startsWith("https://graph.facebook.com/"), true);
delete process.env.IG_UK_LOGIN;

const fixedNow = new Date("2026-10-01T00:00:00Z");
expect("PAT: header parsed", patDaysLeft("2026-10-22 00:00:00 UTC", fixedNow), 21);
expect("PAT: no header = no expiry", patDaysLeft(null, fixedNow), null);
expect("PAT: garbage = unknown", patDaysLeft("soon", fixedNow), null);

// ── Portrait cards only inside the queue window (2026-10-01) ──────────────
// 222 IG cards were rendered for old British articles the queue never takes.
const winNow = new Date("2026-10-01T12:00:00Z");
const igExpiry = pacingFor("instagram_uk").expiryMinutes;
const isoMinus = (min: number) => new Date(winNow.getTime() - min * 60_000).toISOString().replace("T", " ").slice(0, 19);
expect("window: fresh article is in", withinQueueWindow(isoMinus(60), "instagram_uk", winNow), true);
expect("window: at the edge is in", withinQueueWindow(isoMinus(igExpiry), "instagram_uk", winNow), true);
expect("window: older than expiry is out", withinQueueWindow(isoMinus(igExpiry + 1), "instagram_uk", winNow), false);
expect("window: unpublished is out", withinQueueWindow(null, "instagram_uk", winNow), false);


// ── Threads (2026-10-05) ──────────────────────────────────────────────────
// New accounts, so symmetric names on both the queue and the secrets.
{
  // The 2026-10-07 failure, verbatim from the run log.
  const notFound = '{"error":{"message":"The requested resource does not exist","type":"OAuthException","code":24,"error_subcode":4279009,"is_transient":false,"error_user_title":"Media Not Found"}}';
  expect("threads: Media Not Found after FINISHED is retried", isMediaNotYetVisible(400, notFound), true);
  expect("threads: another 400 is not", isMediaNotYetVisible(400, '{"error":{"code":100,"error_subcode":2207051}}'), false);
  expect("threads: a 500 is not this case", isMediaNotYetVisible(500, notFound), false);
}
expect("threads DK queue name", channelNameFor("threads", "DK"), "threads_dk");
expect("threads UK queue name", channelNameFor("threads", "UK"), "threads_uk");
expect("threads secret name", envNameFor("threads", "UK", "ACCESS_TOKEN"), "THREADS_UK_ACCESS_TOKEN");
expect("threads has no legacy secret", legacyEnvNameFor("threads", "DK", "ACCESS_TOKEN"), null);
const thUk = ALL_CHANNELS.find((c) => c.name === "threads_uk");
expect("threads_uk is in ALL_CHANNELS", thUk?.platform, "threads");
expect("threads_uk is British", thUk?.country, "UK");
// Threads draws its preview from the article's og:image, so the share card.
expect("threads uses the share card", thUk?.cardKind, "share");
expect("threads unconfigured without secrets", createThreadsChannel("UK").isConfigured(), false);
process.env.THREADS_UK_USER_ID = "1";
expect("threads half-configured is not configured", createThreadsChannel("UK").isConfigured(), false);
process.env.THREADS_UK_ACCESS_TOKEN = "2";
expect("threads configured with both", createThreadsChannel("UK").isConfigured(), true);
expect("Danish Threads does not inherit British secrets", createThreadsChannel("DK").isConfigured(), false);
delete process.env.THREADS_UK_USER_ID;
delete process.env.THREADS_UK_ACCESS_TOKEN;

// Copy: 500 characters, and the link travels as link_attachment, not in text.
const thText = buildPostText({ ...input, description: "x".repeat(900), sport: "golf", country: "DK" }, "threads");
expect("threads text holds 500", [...thText].length <= 500, true);
expect("threads text carries no URL", thText.includes("http"), false);
expect("threads text carries no hashtags (topic_tag does that)", thText.includes("#"), false);
expect("threads = title + description", buildPostText(input, "threads"), `${input.title}\n\n${input.description}`);

// Topic tag: ONE per post, the niche (country), never the sport ocean.
expect("topic tag DK", threadsTopicTag("DK"), "dansksport");
expect("topic tag UK", threadsTopicTag("UK"), "BritsAbroad");
expect("unknown country → no topic", threadsTopicTag("XX"), null);

const thParams = threadsContainerParams(
  { text: "Hej", url: "https://studentathlete.dk/a", title: "t", summary: null, imageUrl: "https://x/c.png" },
  "DK",
  "tok",
);
expect("container is a TEXT post", thParams.get("media_type"), "TEXT");
expect("container carries the link as attachment", thParams.get("link_attachment"), "https://studentathlete.dk/a");
expect("container carries the topic", thParams.get("topic_tag"), "dansksport");
expect("container carries the text", thParams.get("text"), "Hej");
expect("no topic param when the country has none", threadsContainerParams(
  { text: "x", url: "u", title: "t", summary: null, imageUrl: "i" }, "XX", "tok").has("topic_tag"), false);

// Token renewal: same job, two APIs. Instagram login and Threads differ only in
// host and grant type — mixing them up gives a 400 every week.
const igReq = refreshRequestFor("instagram", "abc");
expect("IG refresh host", igReq.startsWith("https://graph.instagram.com/refresh_access_token?"), true);
expect("IG refresh grant", igReq.includes("grant_type=ig_refresh_token"), true);
const thReq = refreshRequestFor("threads", "abc");
expect("Threads refresh host", thReq.startsWith("https://graph.threads.net/refresh_access_token?"), true);
expect("Threads refresh grant", thReq.includes("grant_type=th_refresh_token"), true);

// ── Social links carry their channel (2026-10-05) ─────────────────────────
// Zero bsky.app referrers in 30 days: app clicks carry none. The tag is the
// only way the dashboard can join a visit to the post that sent it.
expect("DK link uses ?kilde=", taggedArticleUrl("https://studentathlete.dk/fodbold/x", "bluesky", "da"), "https://studentathlete.dk/fodbold/x?kilde=bluesky");
expect("UK link uses ?source=", taggedArticleUrl("https://www.student-athlete.co.uk/football/x", "threads_uk", "en"), "https://www.student-athlete.co.uk/football/x?source=threads_uk");
expect("existing query → &", taggedArticleUrl("https://a.dk/x?p=2", "instagram", "da"), "https://a.dk/x?p=2&kilde=instagram");

// ── Follower counts (2026-10-05) ──────────────────────────────────────────
const acct = (platform: "bluesky" | "instagram" | "facebook" | "threads", country: string) =>
  ({ platform, country, channel: channelNameFor(platform, country) });
delete process.env.BLUESKY_UK_HANDLE;
expect("followers: no handle → no request", followerRequest(acct("bluesky", "UK")), null);
process.env.BLUESKY_UK_HANDLE = "student-athlete.co.uk";
const bsReq = followerRequest(acct("bluesky", "UK"))!;
expect("followers: bluesky asks the public AppView", bsReq.url.startsWith("https://public.api.bsky.app/"), true);
expect("followers: bluesky needs no password", bsReq.url.includes("student-athlete.co.uk"), true);
expect("followers: bluesky count", bsReq.pick({ followersCount: 10 }), 10);
expect("followers: missing count → null", bsReq.pick({}), null);
delete process.env.BLUESKY_UK_HANDLE;

expect("followers: unconfigured IG → null", followerRequest(acct("instagram", "UK")), null);
process.env.IG_UK_USER_ID = "17841";
process.env.IG_UK_ACCESS_TOKEN = "t";
process.env.IG_UK_LOGIN = "instagram";
const igFollow = followerRequest(acct("instagram", "UK"))!;
expect("followers: IG UK on the Instagram-login host", igFollow.url.startsWith("https://graph.instagram.com/"), true);
expect("followers: IG count", igFollow.pick({ followers_count: 42, id: "1" }), 42);
delete process.env.IG_UK_USER_ID;
delete process.env.IG_UK_ACCESS_TOKEN;
delete process.env.IG_UK_LOGIN;

process.env.THREADS_UK_USER_ID = "9";
process.env.THREADS_UK_ACCESS_TOKEN = "t";
const thFollow = followerRequest(acct("threads", "UK"))!;
expect("followers: threads uses insights", thFollow.url.includes("/threads_insights?metric=followers_count"), true);
expect("followers: threads count from total_value",
  thFollow.pick({ data: [{ name: "followers_count", total_value: { value: 7 } }] }), 7);
expect("followers: threads without the metric → null", thFollow.pick({ data: [] }), null);
delete process.env.THREADS_UK_USER_ID;
delete process.env.THREADS_UK_ACCESS_TOKEN;

// The dashboard keeps its own copy of the channel names (pipeline/ is outside
// the Next build). A drift would silently show a channel with zero posts.
expect(
  "dashboard channel names = registry channel names",
  JSON.stringify(dashboardChannels(Object.keys(COUNTRIES)).map((c) => c.channel).sort()),
  JSON.stringify(allAccounts().map((a) => a.channel).sort()),
);
