/**
 * Meta-kanariefugl: har tokenet de rettigheder det skal bruge?
 * ============================================================
 *
 * Det gamle tjek (`meta-check.yml`) slog SIDEN op — `GET /<page-id>?fields=name`
 * — og konkluderede «forbindelsen lever». Det var sandt og alligevel
 * ubrugeligt: 15. september blev `FB_PAGE_ACCESS_TOKEN` fornyet som led i
 * Instagram-opsætningen, mintet med `instagram_basic` +
 * `instagram_content_publish` og UDEN `pages_manage_posts`. Et sådant token
 * læser siden med glæde. Kanariefuglen var grøn i elleve dage, mens Facebook
 * var død, og fejlen viste sig først da redaktionen udgav igen 16. september
 * kl. 17:03 og køen ramte en `(#200) OAuthException`.
 *
 * Lektien er ikke «tjek oftere», men «tjek det rigtige»: et token er ikke
 * enten levende eller dødt — det har et SÆT af rettigheder, og posteringen
 * bruger nogle andre end opslaget af sidens navn. Derfor spørger vi her om
 * rettighederne ved navn, ikke om forbindelsen.
 *
 * TO KILDER, fordi den præcise kræver mere end vi altid har:
 *
 *   1. `/debug_token` — autoritativ: den lister `scopes` OG `expires_at`.
 *      Den kræver et app access token, altså `FB_APP_ID` + `FB_APP_SECRET`.
 *      Er de ikke sat, springes tjekket over med en tydelig besked; det er
 *      grunden til at de to secrets er værd at tilføje.
 *   2. Et læsekald pr. konto (`/<page-id>`, `/<ig-id>`). Beviser ikke
 *      skriverettigheden, men fanger et token der er udløbet eller trukket
 *      tilbage — og virker uden app-legitimation.
 *
 * `--warn-only` gør hver fejl til en advarsel og afslutter med 0. Det er
 * tilstanden i social-kørslen: et dødt Meta-token må IKKE stoppe Bluesky, som
 * netop postede fint mens Facebook lå ned. Kanariefuglens egen kørsel bruger
 * den strenge tilstand, hvor exit 1 udløser Discord-beskeden.
 *
 * Tokenet skrives aldrig ud — hverken i URL, log eller fejlbesked.
 *
 * Kør:
 *   npx tsx pipeline/social/check-tokens.ts
 *   npx tsx pipeline/social/check-tokens.ts --warn-only
 */

// Samme version som facebook.ts og instagram.ts — ét sted at bumpe, når Meta udfaser.
const GRAPH = "https://graph.facebook.com/v26.0";

/** Under så mange dage til udløb er et token en opgave, ikke en detalje. */
const EXPIRY_WARNING_DAYS = 14;

interface Problem {
  /** Kort etiket — første linje i loggen og i Discord-beskeden. */
  label: string;
  detail: string;
}

interface TokenDebug {
  scopes: string[];
  /** Sekunder siden epoch. 0 betyder «udløber aldrig» hos Meta. */
  expiresAt: number | null;
  isValid: boolean;
  error: string | null;
}

/**
 * Spørg Meta hvad der er I tokenet.
 *
 * `input_token` er det token vi undersøger, `access_token` er app-tokenet der
 * giver os lov at spørge. De er forskellige med vilje: et token kan ikke
 * troværdigt beskrive sig selv.
 */
async function debugToken(input: string, appId: string, appSecret: string): Promise<TokenDebug> {
  const empty: TokenDebug = { scopes: [], expiresAt: null, isValid: false, error: null };
  try {
    const url =
      `${GRAPH}/debug_token?input_token=${encodeURIComponent(input)}` +
      `&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`;
    const res = await fetch(url);
    const body = (await res.json()) as {
      data?: { scopes?: string[]; expires_at?: number; is_valid?: boolean };
      error?: { message?: string };
    };
    if (!res.ok || body.error) {
      return { ...empty, error: body.error?.message ?? `HTTP ${res.status}` };
    }
    return {
      scopes: body.data?.scopes ?? [],
      expiresAt: body.data?.expires_at ?? null,
      isValid: Boolean(body.data?.is_valid),
      error: null,
    };
  } catch (err) {
    return { ...empty, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Et læsekald der beviser at tokenet stadig accepteres. Siger intet om skriverettigheder. */
async function probe(url: string, token: string): Promise<string | null> {
  try {
    // Bearer-header frem for query-parameter: så kan tokenet ikke havne i en
    // fejltekst fra fetch eller i et proxy-log.
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) return null;
    return `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
  } catch (err) {
    return `kunne ikke nås: ${err instanceof Error ? err.message : String(err)}`;
  }
}

function daysUntil(epochSeconds: number): number {
  return Math.round((epochSeconds * 1000 - Date.now()) / 86_400_000);
}

/**
 * Gennemgå ét tokens rettigheder og udløb.
 *
 * Svarer `/debug_token` slet ikke, siger vi det og lader være med at gætte —
 * en manglende oplysning er ikke det samme som en manglende rettighed.
 */
function judgeToken(account: string, required: string[], debug: TokenDebug): Problem[] {
  const problems: Problem[] = [];
  if (debug.error) {
    console.log(`  ${account}: /debug_token svarede ikke (${debug.error}) — scopes ukendte`);
    return problems;
  }
  if (!debug.isValid) {
    problems.push({ label: `${account}: tokenet er ugyldigt`, detail: "debug_token: is_valid = false" });
    return problems;
  }

  const missing = required.filter((s) => !debug.scopes.includes(s));
  if (missing.length > 0) {
    problems.push({
      label: `${account}: mangler ${missing.join(", ")}`,
      detail:
        `Tokenet har [${debug.scopes.join(", ") || "ingen scopes"}], men skal bruge [${required.join(", ")}]. ` +
        "Mint et nyt page access token via en LANGTIDS user token → /me/accounts.",
    });
  } else {
    console.log(`  ${account}: alle krævede scopes til stede (${required.join(", ")})`);
  }

  // Udløb. 0 = udløber aldrig, hvilket er dét et page-token afledt af en
  // langtids user token skal svare. Alt andet er en påmindelse med en dato.
  if (debug.expiresAt === null || debug.expiresAt === 0) {
    console.log(`  ${account}: udløber aldrig ✓`);
    return problems;
  }
  const days = daysUntil(debug.expiresAt);
  const when = new Date(debug.expiresAt * 1000).toISOString().slice(0, 10);
  if (days <= EXPIRY_WARNING_DAYS) {
    problems.push({
      label: `${account}: tokenet udløber om ${days} dage (${when})`,
      detail:
        "Det er et korttidstoken. Byt user-tokenet til en langtidsudgave " +
        "(grant_type=fb_exchange_token) FØR /me/accounts, så udløber page-tokenet aldrig.",
    });
  } else {
    console.log(`  ${account}: udløber ${when} (om ${days} dage) — altså ikke afledt af en langtids user token`);
  }
  return problems;
}

/** Én konto: læsekald + (hvis muligt) rettighedstjek. */
async function checkAccount(
  account: string,
  id: string,
  token: string,
  fields: string,
  required: string[],
  app: { id: string; secret: string } | null,
): Promise<Problem[]> {
  console.log(`${account}:`);
  const problems: Problem[] = [];
  const err = await probe(`${GRAPH}/${id}?fields=${fields}`, token);
  if (err) problems.push({ label: `${account}: kontoen kunne ikke læses`, detail: err });
  else console.log("  kontoen kan læses ✓");
  if (app) problems.push(...judgeToken(account, required, await debugToken(token, app.id, app.secret)));
  return problems;
}

async function main(): Promise<void> {
  const warnOnly = process.argv.includes("--warn-only");
  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const app = appId && appSecret ? { id: appId, secret: appSecret } : null;

  if (!app) {
    console.log(
      "⚠ FB_APP_ID/FB_APP_SECRET mangler — scopes og udløb kan ikke aflæses.\n" +
        "  Uden dem fanger tjekket kun et dødt token, ikke et token med forkerte\n" +
        "  rettigheder — netop dét der gik galt 15. september. De to værdier står på\n" +
        "  app'ens side i Meta for Developers og kræver ingen ny indlogning.\n",
    );
  }

  const problems: Problem[] = [];

  if (process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN) {
    problems.push(
      ...(await checkAccount(
        "Facebook",
        process.env.FB_PAGE_ID,
        process.env.FB_PAGE_ACCESS_TOKEN,
        "name,category",
        ["pages_manage_posts", "pages_read_engagement"],
        app,
      )),
    );
  } else {
    console.log("Facebook: springes over (FB_PAGE_ID eller FB_PAGE_ACCESS_TOKEN mangler)");
  }

  if (process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN) {
    problems.push(
      ...(await checkAccount(
        "Instagram",
        process.env.IG_USER_ID,
        process.env.IG_ACCESS_TOKEN,
        "id,username",
        ["instagram_basic", "instagram_content_publish"],
        app,
      )),
    );
  } else {
    console.log("Instagram: springes over (IG_USER_ID eller IG_ACCESS_TOKEN mangler)");
  }

  if (problems.length === 0) {
    console.log("\n✅ Meta-tokens er i orden.");
    return;
  }

  console.log("");
  for (const p of problems) console.log(`${warnOnly ? "⚠" : "❌"} ${p.label}\n   ${p.detail}`);
  if (warnOnly) {
    console.log("\n(--warn-only: kørslen fortsætter — de øvrige kanaler er upåvirkede.)");
    return;
  }
  process.exit(1);
}

// Entrypoint-vagt: import må aldrig sende kald til Meta.
if (process.argv[1] && /check-tokens\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Token-tjek fejlede:", err);
    process.exit(1);
  });
}
