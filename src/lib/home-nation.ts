/**
 * Which home nation a British athlete's hometown is in — for the stats page.
 *
 * Rosters write hometowns every way there is: "Durham, England", "London,
 * U.K.", "Omagh, Ireland", "Bristol, United Kingdom". Three layers, in order:
 *
 *   1. Not British at all. Measured 2026-09-28 on the 2,760 UK athletes: 15
 *      were wrong matches — Torquay/Doncaster in Australia, Grimsby/Woking in
 *      Canada, North Oldham in Kentucky, and four Americans from Wales, Mass.
 *      counted as Welsh. They are left out of the stats, not guessed at.
 *   2. The nation is written out ("Scotland"), or the town is on the short
 *      lists below.
 *   3. "Town, UK": the town's nation as OUR OWN data writes it elsewhere
 *      ("Bristol, England" elsewhere ⇒ Bristol is English). Resolved 391 of 517
 *      such hometowns on the day it was built. The rest stay "unknown" — an
 *      honest bucket beats inflating England.
 */

export type Nation = "england" | "scotland" | "wales" | "northern-ireland";
export type NationResult = Nation | "unknown" | "not-uk";

export const NATIONS: Nation[] = ["england", "scotland", "wales", "northern-ireland"];

const NOT_UK =
  /\b(australia|austraila|aus|victoria|nsw|new south wales|queensland|canada|ont\.?|ontario|alta\.?|alberta|b\.c\.|mass\.?|massachusetts|ky\.?|kentucky|n\.y\.|norway|usa|u\.s\.a?\.?|new zealand|south africa|republic of ireland)\b/i;

/** Towns the data layer can't be trusted to learn (few rows) but we know. */
const SCOTTISH = new Set([
  "aberdeen", "dundee", "edinburgh", "glasgow", "inverness", "perth", "stirling", "st andrews",
  "st. andrews", "paisley", "livingston", "dunfermline", "kirkcaldy", "ayr", "kilmarnock",
  "falkirk", "motherwell", "hamilton", "east kilbride", "cumbernauld", "bellshill",
  "dalgety bay", "musselburgh", "north berwick", "peebles", "galashiels", "elgin", "oban",
  "fort william", "arbroath", "montrose", "stonehaven", "helensburgh", "bearsden",
  "milngavie", "giffnock", "newton mearns", "linlithgow", "bathgate", "dumfries", "irvine",
  "troon", "prestwick", "largs", "greenock", "dunblane", "bridge of allan", "crieff",
  "pitlochry", "nairn", "forres", "thurso", "wick", "lerwick", "kirkwall", "stornoway",
]);

const WELSH = new Set([
  "cardiff", "swansea", "newport", "wrexham", "bangor", "aberystwyth", "carmarthen",
  "llanelli", "bridgend", "barry", "caerphilly", "pontypridd", "merthyr tydfil", "neath",
  "port talbot", "cwmbran", "abergavenny", "monmouth", "chepstow", "penarth", "llandudno",
  "rhyl", "colwyn bay", "holyhead", "brecon", "haverfordwest", "pembroke", "tenby",
  "cowbridge", "mold", "ruthin", "denbigh", "welshpool", "newtown", "machynlleth",
]);

const NORTHERN_IRISH = new Set([
  "belfast", "derry", "londonderry", "lisburn", "newry", "armagh", "bangor, co. down",
  "omagh", "enniskillen", "coleraine", "ballymena", "antrim", "carrickfergus", "larne",
  "newtownards", "portadown", "lurgan", "craigavon", "dungannon", "cookstown", "strabane",
  "limavady", "portrush", "portstewart", "holywood", "banbridge", "downpatrick", "newcastle, co. down",
  "magherafelt", "ballymoney",
]);

const NI_COUNTY = /\bco(unty|\.)?\s*(antrim|armagh|down|fermanagh|londonderry|derry|tyrone)\b/i;

function town(hometown: string): string {
  return hometown.split(",")[0].trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Per-hometown memo. The page counts ~2,800 rows under Workers' 10 ms CPU
 * ceiling, and the same hometown string recurs (43 × "London, United Kingdom");
 * without it the regexes alone took 8.5 ms locally.
 */
const memo = new Map<string, NationResult | null>();

/** The nation a hometown states outright, or via our short lists. */
export function explicitNation(hometown: string | null): NationResult | null {
  const key = hometown ?? "";
  if (memo.has(key)) return memo.get(key)!;
  if (memo.size > 10_000) memo.clear();
  const result = explicitUncached(key);
  memo.set(key, result);
  return result;
}

function explicitUncached(hometown: string): NationResult | null {
  const h = hometown.trim();
  if (!h) return "unknown";
  // Before the nation words: "Wales, Mass." and "New South Wales" are not Wales.
  if (NOT_UK.test(h)) return "not-uk";
  if (/northern ireland|n\.\s?ireland|\bni\b/i.test(h) || NI_COUNTY.test(h)) return "northern-ireland";
  if (/scotland/i.test(h)) return "scotland";
  if (/\bwales\b/i.test(h)) return "wales";
  if (/england/i.test(h)) return "england";
  const t = town(h);
  if (SCOTTISH.has(t)) return "scotland";
  if (WELSH.has(t)) return "wales";
  if (NORTHERN_IRISH.has(t) || NORTHERN_IRISH.has(h.toLowerCase())) return "northern-ireland";
  // "Omagh, Ireland" was caught above; any other plain Ireland is the Republic.
  if (/\bireland\b/i.test(h)) return "not-uk";
  return null;
}

export type TownVotes = Map<string, Map<Nation, number>>;

/** How our own data writes each town's nation, from the explicit hometowns. */
export function learnTowns(hometowns: (string | null)[]): TownVotes {
  const votes: TownVotes = new Map();
  for (const h of hometowns) {
    const n = explicitNation(h);
    if (!h || !n || n === "unknown" || n === "not-uk") continue;
    const t = town(h);
    const v = votes.get(t) ?? new Map<Nation, number>();
    v.set(n, (v.get(n) ?? 0) + 1);
    votes.set(t, v);
  }
  return votes;
}

export function resolveNation(hometown: string | null, votes: TownVotes): NationResult {
  const direct = explicitNation(hometown);
  if (direct) return direct;
  const v = votes.get(town(hometown ?? ""));
  if (!v) return "unknown";
  let best: Nation | null = null, bestN = 0, total = 0;
  for (const [n, c] of v) {
    total += c;
    if (c > bestN) { best = n; bestN = c; }
  }
  // A town our data disagrees with itself about stays unknown.
  return best && bestN / total >= 0.8 ? best : "unknown";
}
