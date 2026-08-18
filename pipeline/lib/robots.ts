/**
 * Minimal robots.txt-efterlevelse for pipelinen.
 *
 * HVORFOR den findes nu: interesseafvejningen (`UDKAST-LIA-interesseafvejning.md`)
 * lover udtrykkeligt at vi respekterer robots.txt, og DSM art. 4's TDM-undtagelse
 * hviler på samme betingelse. Indtil nu hentede scraperen roster-sider uden at
 * spørge. Sport-inventaret gør det værre at springe over, fordi det åbner en NY
 * sti (skolernes `/api/v2/...`), og et api-kald er præcis den slags en skole kan
 * have forbudt selvom rostersiden er fri.
 *
 * Bevidst simpel: vi understøtter `User-agent`, `Disallow`, `Allow` og
 * længste-match-reglen. Ingen `Crawl-delay` (vi venter altid 1 s alligevel),
 * ingen wildcards ud over `*`-gruppen og `*`/`$` i stier — det dækker de mønstre
 * college-sitene faktisk bruger.
 *
 * Fail-open: kan robots.txt ikke hentes (timeout, 404, 500), antager vi at alt er
 * tilladt. Det er den udbredte fortolkning, og et nedbrud hos skolen må ikke
 * stoppe en kørsel.
 */

interface RobotsRule {
  allow: boolean;
  /** Sti-mønster som regex, oversat fra robots-syntaks. */
  pattern: RegExp;
  /** Mønsterets rå længde — længste match vinder (robots-standardens regel). */
  length: number;
}

export interface RobotsPolicy {
  allows(pathname: string): boolean;
}

/** Alt tilladt — bruges når robots.txt ikke kan hentes eller er tom. */
export const ALLOW_ALL: RobotsPolicy = { allows: () => true };

function patternToRegex(raw: string): RegExp {
  // Escape regex-tegn, men bevar robots' egne jokere: * (vilkårligt) og $ (slut).
  let out = "";
  for (const ch of raw) {
    if (ch === "*") out += ".*";
    else if (ch === "$") out += "$";
    else out += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + out);
}

/**
 * Parse robots.txt til en politik for ÉN user-agent.
 *
 * Gruppevalg følger standarden: den mest specifikke matchende gruppe vinder, og
 * `*`-gruppen bruges kun hvis vores egen agent ikke er nævnt.
 */
export function parseRobots(text: string, userAgent: string): RobotsPolicy {
  const ua = userAgent.toLowerCase();
  const groups: { agents: string[]; rules: RobotsRule[] }[] = [];
  let current: { agents: string[]; rules: RobotsRule[] } | null = null;
  let lastLineWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      // Flere user-agent-linjer i træk = én gruppe med flere agenter.
      if (!current || !lastLineWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastLineWasAgent = true;
      continue;
    }

    lastLineWasAgent = false;
    if (!current) continue;
    if (field !== "disallow" && field !== "allow") continue;
    // "Disallow:" uden værdi betyder "intet forbudt" — ikke "alt forbudt".
    if (field === "disallow" && value === "") continue;

    current.rules.push({
      allow: field === "allow",
      pattern: patternToRegex(value),
      length: value.length,
    });
  }

  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
  const wildcard = groups.filter((g) => g.agents.includes("*"));
  const chosen = specific.length > 0 ? specific : wildcard;
  const rules = chosen.flatMap((g) => g.rules);

  if (rules.length === 0) return ALLOW_ALL;

  return {
    allows(pathname: string): boolean {
      let best: RobotsRule | null = null;
      for (const rule of rules) {
        if (!rule.pattern.test(pathname)) continue;
        // Længste mønster vinder; ved lige længde vinder Allow (standardens råd).
        if (!best || rule.length > best.length || (rule.length === best.length && rule.allow)) {
          best = rule;
        }
      }
      return best ? best.allow : true;
    },
  };
}

const cache = new Map<string, RobotsPolicy>();

/**
 * Hent (og husk) politikken for en vært. Én robots.txt pr. vært pr. kørsel —
 * ikke pr. URL, ellers ville vi hente den 20 gange for samme skole.
 */
export async function robotsFor(
  origin: string,
  userAgent: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RobotsPolicy> {
  const cached = cache.get(origin);
  if (cached) return cached;

  let policy = ALLOW_ALL;
  try {
    const res = await fetchImpl(`${origin}/robots.txt`, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    if (res.ok) {
      const text = await res.text();
      // En HTML-fejlside i stedet for robots.txt må ikke parses som regler.
      if (!/^\s*</.test(text)) policy = parseRobots(text, userAgent);
    }
  } catch {
    // Fail-open, jf. filens header.
  }

  cache.set(origin, policy);
  return policy;
}

/** Må vi hente denne URL? Fail-open ved ugyldig URL (kalderen fejler alligevel). */
export async function robotsAllows(
  url: string,
  userAgent: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return true;
  }
  const policy = await robotsFor(u.origin, userAgent, fetchImpl);
  return policy.allows(u.pathname + u.search);
}

/** Kun til test: nulstil værts-cachen mellem tilfælde. */
export function _clearRobotsCache(): void {
  cache.clear();
}
