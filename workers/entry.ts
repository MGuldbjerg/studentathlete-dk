/**
 * Worker-indgangen: kant-cache FORAN OpenNexts worker.
 * ====================================================
 *
 * HVORFOR DEN IKKE KUNNE LAVES I DASHBOARDET. Zone-Cache Rules blev sat op på
 * begge zoner 22. september — korrekte udtryk, `enabled: true`, verificeret via
 * API'et — og havde **ingen målbar virkning på noget som helst**: hverken
 * forsiden, `/feed.xml`, `/sitemap.xml` eller `/icon.png` fik en
 * `cf-cache-status`, og bypass-reglen kunne ikke engang ses på en anmodning der
 * skulle rammes af den. Det eneste svar der cachede, var `/api/og` — fordi
 * image-content-typen fanges af Cloudflares STANDARD-cache, hvilket den også
 * gjorde dage før den første regel fandtes.
 *
 * Forklaringen er laget: workeren besvarer anmodningen selv, så der er ingen
 * origin-hentning for zone-cachen at stå foran. To hypoteser blev afkræftet
 * undervejs og er værd at holde begravet: det er **ikke** `Vary` (`/api/og`
 * bærer den samme `vary: rsc, …` og caches fint), og det er **ikke**
 * `max-age=0` (`/feed.xml` beder om en time i begge ender og caches heller
 * ikke).
 *
 * OPENNEXTS EGEN CACHE HJÆLPER HELLER IKKE. Dokumentationen indleder med at
 * «SSR route will work out of the box without any caching config» — altså slet
 * ingen caching af SSR. Og siderne her ER dynamiske: `/skoler`, `/atleter`,
 * `/viden` og `/viden/[slug]` er `force-dynamic`, og `site-server.ts` kalder
 * `headers()`, som hver eneste side når gennem `currentSite()`. Kun `/artikler`
 * har `revalidate`. Det er den samme mur som statisk pre-rendering løb ind i,
 * og af samme grund: sitets identitet kommer fra Host-headeren pr. anmodning.
 *
 * Derfor Cache API'et, her, hvor koden faktisk kører.
 *
 * ⚠️ **Det gør IKKE CPU'en nul.** Modsat et zone-cache-hit kører workeren
 * stadig ved hvert kald — vi sparer Next-renderingen, ikke invokationen.
 * Renderingen er den dyre del (fejl 1102 er 10 ms CPU PR. KALD), så
 * fejlprocenten bør falde markant. Den forsvinder ikke.
 *
 * Cache-nøglen er hele URL'en inkl. værtsnavn, så `.dk` og `.co.uk` holdes fra
 * hinanden af sig selv. Det er præcis det, der gjorde statisk pre-rendering
 * umuligt, og her er det gratis.
 */

// Indgangen ligger i workers/, som tsconfig ekskluderer. Det er ikke pynt:
// `next build` kører FØR `opennextjs-cloudflare build`, så en rodfil der
// importerer `.open-next/worker.js` vælter bygget på et artefakt bygget selv
// skal generere bagefter. Målt: exit 1 på første forsøg.
import worker, { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "../.open-next/worker.js";
// Reglerne selv ligger i et modul uden byggeafhængighed, så de kan testes.
import { EDGE_TTL_SECONDS, bypasses, isCacheable } from "../src/lib/worker-cache";

// Durable Object-klasserne er en del af den genererede workers offentlige
// flade. Videreeksporteres de ikke, fejler deployet på manglende bindinger.
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge };

/**
 * Kun det stykke af Workers' `ExecutionContext` vi bruger.
 *
 * `@cloudflare/workers-types` globalt ville betyde `"types"` i tsconfig, og
 * den samme tsconfig bygger Next-appen med DOM-typer. Én metode er billigere
 * end at gøre hele projektets typeunivers til et Workers-univers.
 */
interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

const handler = {
  async fetch(req: Request, env: unknown, ctx: WorkerContext): Promise<Response> {
    if (bypasses(req)) return worker.fetch(req, env, ctx);

    const cache = (caches as unknown as { default: Cache }).default;
    const hit = await cache.match(req);
    if (hit) return hit;

    const res = await worker.fetch(req, env, ctx);
    if (!isCacheable(res)) return res;

    // Kopien får kant-TTL'en. `res.body` kan kun læses én gang, derfor clone.
    const copy = new Response(res.body, res);
    copy.headers.set("cache-control", `public, max-age=0, s-maxage=${EDGE_TTL_SECONDS}`);

    // ⚠️ RÆKKEFØLGEN ER SELVE POINTEN, og den er usynlig hvis man ikke ved det.
    //
    // `clone()` kopierer headerne I DET ØJEBLIK den kaldes. Gemmer vi FØRST og
    // sætter mærkaten BAGEFTER, står mærkaten kun på det svar denne læser får —
    // som den skal. Byttet om ville «MISS» blive GEMT og derefter serveret ved
    // hvert eneste hit: et instrument der påstår MISS præcis når svaret kommer
    // fra cachen. Første udgave gjorde dét, og det stod side om side med
    // `cf-cache-status: HIT` (målt 22. september).
    //
    // Et måleinstrument der lyver, koster mere end ingen måling — det er tredje
    // gang på en uge dette projekt har brugt tid på et grønt lys uden dækning.
    ctx.waitUntil(cache.put(req, copy.clone()));
    copy.headers.set("x-sa-cache", "MISS");
    return copy;
  },
};

export default handler;
