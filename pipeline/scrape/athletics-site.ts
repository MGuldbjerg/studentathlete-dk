/**
 * Find skolens ATLETIKSITE, når `schools.website` peger på universitetet.
 * =====================================================================
 *
 * Hullet dette lukker. Sport-inventaret fandt ingen hold på 435 skoler — 258 af
 * dem i D3. Det var ikke deres platform der var problemet: vi spurgte den rigtige
 * skole på den forkerte adresse. `schools.website` er for de skoler
 * universitetets hovedside (`https://www.kzoo.edu`), og rosters ligger på et
 * selvstændigt værtsnavn (`https://hornetathletics.com`), som college-verdenen
 * bruger overalt.
 *
 * Modulet her er RENT: ingen fetch, ingen D1. Det producerer KANDIDATER, og
 * kalderen bekræfter dem ved at hente dem — en kandidat gemmes aldrig på et gæt.
 * Det er hele forskellen mellem denne fil og det gætteri den erstatter: her er
 * gættet et forslag, der skal bevise sig, ikke en URL vi skriver i basen.
 */

/**
 * Værter der ALDRIG er en skoles atletiksite, selvom universitetet linker til dem.
 * Uden listen ville "sports" i værtsnavnet pege os mod ESPN og platform-
 * leverandørerne, og "go" mod Google.
 */
const NEVER_ATHLETICS = [
  "espn.com", "espn.go.com", "ncaa.com", "ncaa.org", "sidearmsports.com",
  "prestosports.com", "wmt.digital", "learfield.com", "google.com", "gstatic.com",
  "facebook.com", "twitter.com", "x.com", "instagram.com", "youtube.com",
  "tiktok.com", "linkedin.com", "flickr.com", "vimeo.com", "issuu.com",
  "ticketmaster.com", "stubhub.com", "amazon.com", "apple.com", "spotify.com",
  "sports.yahoo.com", "si.com", "cbssports.com", "foxsports.com", "usatoday.com",
  "eventbrite.com", "hudl.com", "athletic.net", "milesplit.com", "tfrrs.org",
];

/** Ord i et værtsnavn der peger på et atletiksite. */
const ATHLETICS_MARKERS = ["athletic", "sports", "sport", "tigers", "eagles", "bulldogs"];

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isBlocked(host: string): boolean {
  return NEVER_ATHLETICS.some((bad) => host === bad || host.endsWith("." + bad));
}

/**
 * Ser værtsnavnet ud som et atletiksite?
 *
 * To signaler: et markør-ord ("athletics", "sports"), eller college-verdenens
 * "go"-konvention (gozips.com, gocards.com, goheels.com), som er så udbredt at
 * den er værd at kende — men KUN som prefiks, ellers rammer vi google.com.
 */
export function looksLikeAthleticsHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (isBlocked(h)) return false;
  if (ATHLETICS_MARKERS.some((m) => h.includes(m))) return true;
  return /^go[a-z]{3,}\.(com|net|org)$/.test(h);
}

/**
 * Kandidater fra universitetets egen HTML.
 *
 * Det STÆRKESTE signal er ikke værtsnavnet, men stien: et link til
 * `/sports/<noget>/roster` eller `/sports/<noget>/schedule` kommer fra et
 * Sidearm-site, uanset hvad værten hedder. Derfor rangeres sti-fund først.
 */
export function candidatesFromHtml(html: string, base: string): string[] {
  const baseHost = hostOf(base);
  const strong: string[] = [];
  const weak: string[] = [];
  const seen = new Set<string>();

  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let abs: URL;
    try {
      abs = new URL(m[1].replace(/&amp;/g, "&"), base);
    } catch {
      continue;
    }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
    const host = abs.hostname.toLowerCase().replace(/^www\./, "");
    if (!host || isBlocked(host)) continue;

    const origin = `https://${host}`;
    if (seen.has(origin)) continue;

    const isSidearmPath = /\/sports\/[a-z0-9-]+\/(roster|schedule)/i.test(abs.pathname);
    // Universitetets eget værtsnavn er ikke et fund — vi kom derfra.
    if (isSidearmPath && host !== baseHost) {
      seen.add(origin);
      strong.push(origin);
    } else if (host !== baseHost && looksLikeAthleticsHost(host)) {
      seen.add(origin);
      weak.push(origin);
    }
  }
  return [...strong, ...weak];
}

/**
 * Mønstre der er værd at prøve, når universitetets side ikke linker tydeligt.
 * Rene gæt — de skal bekræftes som alle andre kandidater.
 */
export function guessedCandidates(website: string): string[] {
  const host = hostOf(website);
  if (!host) return [];
  const out = [`https://athletics.${host}`, `https://sports.${host}`, `https://${host}/athletics`];
  // Nogle skoler ligger på et under-domæne ("www.athletics.foo.edu" fanges ovenfor),
  // andre har atletikken på et helt andet TLD-navn vi ikke kan gætte — det er
  // netop derfor link-fundene kommer først.
  return out;
}

/** Alle kandidater i prioriteret rækkefølge, uden dubletter. */
export function athleticsCandidates(html: string, website: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of [...candidatesFromHtml(html, website), ...guessedCandidates(website)]) {
    const key = c.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}
