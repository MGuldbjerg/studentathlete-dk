/**
 * Kilde-tillid: redirect-opløsning + domæneklassificering.
 *
 * Bruges af check-sources.ts til at:
 * 1. Opløse redirects til den faktiske artikel-URL
 * 2. Klassificere domæner som trusted/neutral/rejected
 * 3. Afvise kendte svindel-TLD'er og utrygge redirects
 */

export type DomainTrust = "trusted" | "neutral" | "rejected";

const USER_AGENT =
  "Mozilla/5.0 (compatible; StudentAthleteBot/1.0; +https://studentathlete.dk)";

// Kendte pålidelige nyhedsdomæner for college-atletik
const TRUSTED_DOMAIN_PATTERNS: RegExp[] = [
  /\bncaa\.com$/,
  /\bespn\.com$/,
  /\bsi\.com$/,
  /\busatoday\.com$/,
  /\bgolfweek\.com$/,
  /\bswimswam\.com$/,
  /\bcollegiatebaseball\.com$/,
  /\bthedanvilleregister\.com$/,
  /\bstatesman\.com$/,
  /\brivalsxn\.com$/,
  /\b247sports\.com$/,
  /\bthe-sun\.com$/,
  /\bbleacherreport\.com$/,
  /\bsbnation\.com$/,
  /\bcbssports\.com$/,
  /\bnbcsports\.com$/,
  /\bfoxsports\.com$/,
  /\bwashingtonpost\.com$/,
  /\bnytimes\.com$/,
  /\bapnews\.com$/,
  /\breuters\.com$/,
  /\btheathleticnet\.com$/,
  /\btheatletic\.com$/,
  /\bgolfchannel\.com$/,
  /\btennis\.com$/,
  /\bswimmingworldmagazine\.com$/,
  /\btrackandfield\.com$/,
  /\.edu$/,                           // Universitets-domæner
  /\bgoterps\.com$/,
  /\bgoheels\.com$/,
  /\bhokiesports\.com$/,
  /\bbigblue\.com$/,
  /athletics\./,                      // *.athletics.* subdomæner
  /\bgoirish\.com$/,
  /\bugasports\.com$/,
  /\bgocrimson\.com$/,
  /\byalesports\.com$/,
  /\bprincetontigers\.com$/,
];

// Høj-risiko TLD'er der er overrepræsenterede i svindel/spam
const SCAM_TLDS: Set<string> = new Set([
  ".xyz",
  ".click",
  ".top",
  ".win",
  ".loan",
  ".gdn",
  ".stream",
  ".download",
  ".gq",
  ".ml",
  ".ga",
  ".cf",
  ".tk",
  ".buzz",
  ".club",   // Ikke altid spam, men lavt signal/noise
  ".icu",
  ".sbs",
  ".cyou",
  ".cfd",
  ".monster",
  ".rest",
]);

/**
 * Klassificerer et domæne baseret på URL.
 * Returnerer 'trusted', 'neutral' eller 'rejected'.
 */
export function classifyDomain(url: string): DomainTrust {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return "rejected";
  }

  // Tjek scam-TLD'er
  for (const tld of SCAM_TLDS) {
    if (hostname.endsWith(tld)) return "rejected";
  }

  // Tjek kendte scam-domæner (faste patterns)
  const scamPatterns = [
    /prize/,
    /winner/,
    /reward/,
    /survey.*win/,
    /freegift/,
    /claimyour/,
  ];
  if (scamPatterns.some((p) => p.test(hostname))) return "rejected";

  // Tjek trusted-domæner
  if (TRUSTED_DOMAIN_PATTERNS.some((p) => p.test(hostname))) return "trusted";

  return "neutral";
}

/**
 * Følger HTTP-redirects og returnerer den endelige URL.
 * Returnerer null ved timeout, netværksfejl eller ikke-HTTP-URL.
 *
 * Bruger HEAD → GET fallback (nogle servere svarer ikke på HEAD).
 */
export async function resolveRedirect(url: string): Promise<string | null> {
  // Kun HTTP/HTTPS
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;

  try {
    // Forsøg HEAD først (undgår at downloade body)
    const headRes = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": USER_AGENT },
    });
    if (headRes.ok || headRes.status < 500) {
      return headRes.url;
    }
  } catch {
    // HEAD mislykkedes — prøv GET
  }

  try {
    const getRes = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": USER_AGENT },
    });
    return getRes.url;
  } catch {
    return null;
  }
}

/**
 * Omregner domain-trust til relevance-score-bonus.
 * Tilføjes til base-score for kildevurdering.
 */
export function trustBonus(trust: DomainTrust): number {
  switch (trust) {
    case "trusted":
      return 10; // 60 + 10 = 70
    case "neutral":
      return -10; // 60 - 10 = 50
    case "rejected":
      return -60; // Bruges ikke (afvises inden score beregnes)
  }
}
