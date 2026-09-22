/**
 * Reglerne for kant-cachen — uden at røre workeren.
 * =================================================
 *
 * Skilt fra `worker-entry.ts` af én grund: den importerer
 * `.open-next/worker.js`, et byggeartefakt der ikke findes i et rent tjek-ud.
 * Så snart testen importerede indgangen, døde hele suiten på et modul der
 * skulle bygges først. Beslutningerne er rene og hører til her, hvor de kan
 * prøves uden et build — samme snit som `interpretContainerStatus` i
 * Instagram-adapteren.
 */

/** Hvor længe et svar må ligge på kanten. Samme 5 minutter som `s-maxage`. */
export const EDGE_TTL_SECONDS = 300;

/**
 * Stier der ALDRIG må caches.
 *
 * `/api/` er med som helhed, ikke stykvis: `/api/og` klarer sig fint på
 * Cloudflares standard-cache (den har gjort det i ugevis — det var det eneste
 * svar på hele sitet der overhovedet cachede), og en liste med undtagelser
 * skulle vedligeholdes hver gang der kom en rute til. Den fejl skal ikke kunne
 * laves i tavshed.
 */
function alwaysDynamic(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/");
}

/**
 * Må dette svar gemmes?
 *
 * `Set-Cookie` er den klassiske måde at lække en session gennem en delt cache,
 * og Cache API'et gemmer den glad. I dag sætter kun `/api/admin/land` en cookie,
 * og den ligger allerede i `alwaysDynamic` — men tjekket hører hjemme HER, hvor
 * det også holder når en ny rute en dag får en cookie.
 */
export function isCacheable(res: Response): boolean {
  if (res.status !== 200) return false;
  if (res.headers.has("set-cookie")) return false;
  const cc = res.headers.get("cache-control") ?? "";
  return !/no-store|private/i.test(cc);
}

/**
 * Skal anmodningen uden om cachen?
 *
 * RSC-headeren er den vigtige: Next serverer to forskellige ting på samme URL —
 * siden, og en `text/x-component`-nyttelast ved klient-navigation. Cachen har
 * én plads pr. URL, så uden det her kunne en prefetch lægge nyttelasten på
 * forsidens plads, og den næste læser ville få en datadump i stedet for et
 * website. Det er værre end de CPU-fejl vi er i gang med at fjerne.
 */
export function bypasses(req: Request): boolean {
  if (req.method !== "GET") return true;
  if (req.headers.has("rsc")) return true;
  return alwaysDynamic(new URL(req.url).pathname);
}
