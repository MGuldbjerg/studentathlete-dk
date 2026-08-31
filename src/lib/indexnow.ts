/**
 * IndexNow — fortæl søgemaskinerne om en ny side i samme sekund den udkommer.
 *
 * Baggrund (2026-08-27): Search Console svarede «URL is unknown to Google» for
 * .co.uk-profilerne. Det er et OPDAGELSES-problem, ikke en kvalitetsdom, og på
 * et tre uger gammelt domæne med 2.703 URLer er crawl-budgettet minimalt.
 *
 * IndexNow løser den halvdel Google ikke er med i: Bing, Yandex, Seznam, Naver
 * og Yep tager imod en direkte besked. Bing er ikke ligegyldigt for os — det
 * er også datagrundlaget bag Copilot og ChatGPTs søgning, og vores trafik er
 * navnesøgninger.
 *
 * GOOGLE ER IKKE MED I INDEXNOW. Googles Indexing API må kun bruges til
 * job-opslag og livestreams, så for Google er intern linkning og sitemap
 * fortsat den eneste vej. Lov aldrig noget andet.
 *
 * Nøglen er OFFENTLIG efter protokollens design: den ligger som en tekstfil på
 * domænet, og det er netop dét der beviser at vi ejer værten. Den skal derfor
 * IKKE i .bashrc eller i secrets.
 */

/** Skal matche filnavnet i public/. Testen holder de to i sync. */
export const INDEXNOW_KEY = "788201c48c4361d286b4181f2b267d8a";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/** IndexNow tager maks 10.000 URLer pr. kald. */
export const INDEXNOW_MAX_URLS = 10000;

/**
 * Byg nyttelasten. Ren funktion, så den kan testes uden netværk.
 * `host` udledes af den første URL — alle URLer i ét kald SKAL ligge på samme
 * vært, ellers afviser protokollen dem.
 */
export function buildPayload(urls: string[]): IndexNowPayload | null {
  if (urls.length === 0) return null;
  let host: string;
  try {
    host = new URL(urls[0]).host;
  } catch {
    return null;
  }
  const sameHost = urls.filter((u) => {
    try {
      return new URL(u).host === host;
    } catch {
      return false;
    }
  });
  if (sameHost.length === 0) return null;
  return {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
    urlList: sameHost.slice(0, INDEXNOW_MAX_URLS),
  };
}

/**
 * Send beskeden. Må ALDRIG kaste: en fejlet ping er en misset indeksering,
 * ikke en fejlet udgivelse. Redaktøren skal ikke se en fejl fordi Bing er nede.
 */
export async function pingIndexNow(urls: string[]): Promise<boolean> {
  const payload = buildPayload(urls);
  if (!payload) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
