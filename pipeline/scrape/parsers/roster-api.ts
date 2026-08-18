/**
 * Ny Sidearm-generation: rosteren ligger i et JSON-API, ikke i HTML.
 * ==================================================================
 *
 * Hvad der var i vejen. Skoler som Louisville, Tennessee og Dartmouth svarede
 * 200 OK på roster-URL'en, men HTML'en indeholdt ikke ét spillernavn — siden er
 * en Nuxt-app der henter holdet efter hydrering. Parseren skrev derfor "Ingen
 * roster-data fundet i HTML" på hver eneste sportsgren på de skoler. En
 * stikprøve på 90 skoler registreret som `platform_type='sidearm'` viste at
 * **42% af NCAA D1 kører den nye platform** (D2: 3%, D3: 0%) — og 73% af vores
 * danske atleter er D1. Det var det største usynlige hul i registret.
 *
 * Hvad der virker i stedet: `GET /api/v2/rosters?sportId=<n>` på skolens egen
 * vært. Ét almindeligt fetch, ingen browser-rendering (og altså ingen forbrug af
 * den daglige browser-tid), og svaret er RIGERE end HTML-parseren nogensinde kom
 * i nærheden af — fornavn og efternavn adskilt, hjemby, high school, forrige
 * skole (transfers), køn eksplicit, højde, position i både kort og lang form,
 * årgang i ord ("Redshirt Sophomore") og et billede med kreditfelt.
 *
 * Tre ting der er verificeret mod acusports.com 2026-08-17 og som koden hviler på:
 *
 *  1. `sportId` er et lille løbenummer (1, 2, 4, …), ikke skolens store interne
 *     id. Ukendte id'er svarer `{"items":[],...}`, ikke fejl — så enumeration er
 *     billig og ufarlig.
 *  2. Bio-URL'en bygges med **`rosterPlayerId`**, ikke `playerId`. Med `playerId`
 *     sendte skolen os videre til en HELT anden sportsgren (en basketballspiller
 *     landede på womens-soccer). Det ville have givet et forkert `roster_key` —
 *     altså forkert identitet, den dyreste fejl vi har.
 *  3. `sport.globalSportNameSlug` ("mens-basketball") er den slug bio-URL'en
 *     bruger — den er ikke altid den samme som roster-sidens egen ("basketball").
 *
 * Sæsonen følger med ud, fordi et program kan ligge stille: ACU's herre-cross
 * country svarer stadig med rosteren fra **2016**. Den må ikke indlæses som et
 * aktivt hold, og kalderen frasorterer på sæson.
 */

import type { RosterEntry } from "../../lib/types";

/** Skolens vært → API-URL for én sportsgren. */
export function apiRosterUrl(origin: string, sportId: number): string {
  return `${origin.replace(/\/$/, "")}/api/v2/rosters?sportId=${sportId}`;
}

/** Probe-URL'en der afgør om værten kører den nye platform. */
export function apiProbeUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/v2/rosters`;
}

/**
 * Svarer værten "sportId mangler"? Så findes API'et.
 *
 * Uden parameter svarer platformen 400 med et RFC 9110-valideringsobjekt, og
 * netop det svar er den billigste platform-detektion vi har: ét request, ingen
 * HTML at parse. En gammel Sidearm-vært svarer 404 uden `sportId` i kroppen.
 */
export function isRosterApiProbe(status: number, body: string): boolean {
  if (status !== 400) return false;
  return body.includes("sportId");
}

export interface ApiRoster {
  /** Sæsonens titel som skolen skriver den ("2026-27", "2026"). */
  season: string | null;
  /** Første årstal i sæsontitlen — til sammenligning med akademisk år. */
  seasonYear: number | null;
  /** Skolens visningstitel ("2026-27 Men's Basketball Roster"). */
  title: string | null;
  /** Sluggen bio-URL'er bruger ("mens-basketball"). */
  teamSlug: string | null;
  gender: "m" | "f" | null;
  entries: RosterEntry[];
}

interface ApiPlayer {
  firstName?: unknown;
  lastName?: unknown;
  hometown?: unknown;
  positionLong?: unknown;
  positionShort?: unknown;
  academicYearShort?: unknown;
  academicYearLong?: unknown;
  rosterPlayerId?: unknown;
  gender?: unknown;
  hide?: unknown;
  sport?: { globalSportNameSlug?: unknown; globalSportGender?: unknown } | null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function normGender(v: unknown): "m" | "f" | null {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "m" || s === "male") return "m";
  if (s === "f" || s === "w" || s === "female") return "f";
  return null;
}

/** Navne-delen af en bio-URL. Skolen ignorerer den (id'et bestemmer), men den
 *  skal se rigtig ud, og `rosterKey()` kræver et ikke-tomt segment før id'et. */
function nameSlug(first: string | null, last: string | null): string {
  const s = `${first ?? ""} ${last ?? ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "player";
}

function seasonYearFrom(title: string | null): number | null {
  if (!title) return null;
  const m = /(\d{4})/.exec(title);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y >= 1900 && y <= 2100 ? y : null;
}

/**
 * Oversæt API-svaret til de rækker resten af pipelinen kender.
 *
 * Returnerer null hvis svaret ikke er en roster (ukendt sportId giver et tomt
 * `items`) — kalderen skal kunne se forskel på "intet hold" og "tomt hold".
 */
export function parseApiRoster(json: unknown, origin: string): ApiRoster | null {
  if (!json || typeof json !== "object") return null;
  const items = (json as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) return null;

  const item = items[0] as {
    players?: unknown;
    season?: { title?: unknown } | null;
    displayTitle?: unknown;
  };
  const players = Array.isArray(item.players) ? (item.players as ApiPlayer[]) : [];

  const season = str(item.season?.title);
  const title = str(item.displayTitle);
  let teamSlug: string | null = null;
  let gender: "m" | "f" | null = null;

  const entries: RosterEntry[] = [];
  for (const p of players) {
    // `hide` er skolens eget "vis ikke denne spiller" — respektér det.
    if (p.hide === true) continue;

    const first = str(p.firstName);
    const last = str(p.lastName);
    const name = [first, last].filter(Boolean).join(" ");
    if (!name) continue;

    const slug = str(p.sport?.globalSportNameSlug);
    if (slug && !teamSlug) teamSlug = slug;
    const g = normGender(p.gender) ?? normGender(p.sport?.globalSportGender);
    if (g && !gender) gender = g;

    const id = typeof p.rosterPlayerId === "number" ? String(p.rosterPlayerId) : str(p.rosterPlayerId);
    const bioUrl =
      id && slug
        ? `${origin.replace(/\/$/, "")}/sports/${slug}/roster/${nameSlug(first, last)}/${id}`
        : null;

    entries.push({
      name,
      position: str(p.positionLong) ?? str(p.positionShort),
      hometown: str(p.hometown),
      year: str(p.academicYearShort) ?? str(p.academicYearLong),
      bioUrl,
      // Køn er DATA her, ikke udledt af en URL — det er hele pointen med API'et.
      gender: g,
    });
  }

  return { season, seasonYear: seasonYearFrom(season) ?? seasonYearFrom(title), title, teamSlug, gender, entries };
}
