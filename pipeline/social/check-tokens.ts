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
import { appendFileSync } from "node:fs";
import { channelIsDisabled } from "./post-social";
import { readAccountEnv } from "./registry";

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
  /** USER eller PAGE. Et USER-token kan bære alle rettigheder og alligevel ikke poste SOM siden. */
  type: string | null;
  /** Hvem tokenet ER. For et page-token: sidens id. */
  profileId: string | null;
  /**
   * Hvilke SIDER hver rettighed gælder for.
   *
   * `scopes` siger at rettigheden er givet — ikke hvor. Siden Metas granulære
   * samtykker kan en administrator give `pages_manage_posts` for side A og ikke
   * for side B, og så står rettigheden i `scopes` mens opslaget på side B
   * afvises med præcis den samme `(#200)`.
   */
  granularScopes: { scope: string; targetIds: string[] }[];
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
  const empty: TokenDebug = {
    scopes: [],
    expiresAt: null,
    isValid: false,
    type: null,
    profileId: null,
    granularScopes: [],
    error: null,
  };
  try {
    const url =
      `${GRAPH}/debug_token?input_token=${encodeURIComponent(input)}` +
      `&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`;
    const res = await fetch(url);
    const body = (await res.json()) as {
      data?: {
        scopes?: string[];
        expires_at?: number;
        is_valid?: boolean;
        type?: string;
        profile_id?: string;
        granular_scopes?: { scope?: string; target_ids?: string[] }[];
      };
      error?: { message?: string };
    };
    if (!res.ok || body.error) {
      return { ...empty, error: body.error?.message ?? `HTTP ${res.status}` };
    }
    return {
      scopes: body.data?.scopes ?? [],
      expiresAt: body.data?.expires_at ?? null,
      isValid: Boolean(body.data?.is_valid),
      type: body.data?.type ?? null,
      profileId: body.data?.profile_id ?? null,
      granularScopes: (body.data?.granular_scopes ?? []).map((g) => ({
        scope: g.scope ?? "",
        targetIds: g.target_ids ?? [],
      })),
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

/**
 * Hvilke af de krævede rettigheder gælder IKKE for denne side?
 *
 * Skrevet 17. september, efter at tjekket meldte grønt og Facebook stadig
 * afviste opslaget med `(#200)`. «Rettigheden er givet» og «rettigheden gælder
 * her» er to forskellige ting: Metas granulære samtykker knytter hver
 * rettighed til bestemte sider, og `scopes` viser kun det første.
 *
 * Har en rettighed ingen granulær post, er den ikke afgrænset — så tæller den
 * som gældende. Fravær af en begrænsning er ikke en begrænsning.
 */
export function scopesNotGrantedForTarget(
  required: string[],
  granularScopes: { scope: string; targetIds: string[] }[],
  targetId: string,
): string[] {
  return required.filter((scope) => {
    const granular = granularScopes.find((g) => g.scope === scope);
    if (!granular || granular.targetIds.length === 0) return false;
    return !granular.targetIds.includes(targetId);
  });
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
function judgeToken(account: string, required: string[], debug: TokenDebug, pageId?: string): Problem[] {
  const problems: Problem[] = [];
  if (debug.error) {
    console.log(`  ${account}: /debug_token svarede ikke (${debug.error}) — scopes ukendte`);
    return problems;
  }
  if (!debug.isValid) {
    problems.push({ label: `${account}: tokenet er ugyldigt`, detail: "debug_token: is_valid = false" });
    return problems;
  }

  console.log(`  ${account}: tokentype ${debug.type ?? "ukendt"}`);

  // ER det et page-token? Et USER-token kan bære hver eneste rettighed og
  // alligevel ikke poste SOM siden — Meta svarer med nøjagtig samme `(#200)`,
  // og fejlteksten nævner ikke med ét ord at typen er problemet.
  if (pageId && debug.type && debug.type !== "PAGE") {
    problems.push({
      label: `${account}: tokenet er et ${debug.type}-token, ikke et PAGE-token`,
      detail:
        "Et user token kan ikke poste som siden, uanset hvilke scopes det har. " +
        "Byt det til et page access token: GET /me/accounts med en langtids user token.",
    });
  }
  if (pageId && debug.profileId && debug.profileId !== pageId) {
    problems.push({
      label: `${account}: tokenet hører til en ANDEN side`,
      detail: `debug_token.profile_id matcher ikke FB_PAGE_ID. Tokenet er mintet for den forkerte side.`,
    });
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

  // …men gælder de HER? Se scopesNotGrantedForTarget: et samtykke kan være
  // givet for én side og ikke for en anden, og `scopes` skelner ikke.
  if (pageId) {
    const elsewhere = scopesNotGrantedForTarget(required, debug.granularScopes, pageId);
    if (elsewhere.length > 0) {
      problems.push({
        label: `${account}: ${elsewhere.join(", ")} er givet, men IKKE for denne side`,
        detail:
          "Rettigheden står i scopes, men Metas granulære samtykke peger på andre sider. " +
          "Kør OAuth-flowet igennem igen og vælg SIDEN til i dialogen — det er dét trin der springes over.",
      });
    } else if (debug.granularScopes.length > 0) {
      console.log(`  ${account}: de granulære samtykker dækker denne side ✓`);
    }
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
  /**
   * Sidens id, når tokenet skal poste SOM en side. Kun da giver «er det et
   * page-token, og gælder samtykket denne side?» mening. Instagram-tokenet
   * hører til siden, men kontoen vi slår op er IG-brugeren, så det id ville
   * aldrig matche — derfor er feltet valgfrit og udelades der.
   */
  pageId?: string,
): Promise<Problem[]> {
  console.log(`${account}:`);
  const problems: Problem[] = [];
  const err = await probe(`${GRAPH}/${id}?fields=${fields}`, token);
  if (err) problems.push({ label: `${account}: kontoen kunne ikke læses`, detail: err });
  else console.log("  kontoen kan læses ✓");
  if (app) {
    problems.push(...judgeToken(account, required, await debugToken(token, app.id, app.secret), pageId));
  }
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
  // Channels switched off on purpose (SOCIAL_DISABLED_CHANNELS, same variable as
  // social-post.yml). Mikkel 2026-09-24: "quiet the canary, I know the token is
  // not set" — Facebook is blocked by Meta's ad restriction on his account, and
  // a daily red run + Discord ping about it is noise. A disabled channel's
  // problems are logged but do not fail the run. What still matters is the day
  // it STARTS working, so a disabled channel with zero problems is announced.
  const known: Problem[] = [];
  const recovered: string[] = [];
  const collect = (channel: string, label: string, found: Problem[]) => {
    if (!channelIsDisabled(channel)) problems.push(...found);
    else if (found.length) known.push(...found);
    else recovered.push(label);
  };

  const fbPageId = readAccountEnv("facebook", "DK", "PAGE_ID");
  const fbToken = readAccountEnv("facebook", "DK", "PAGE_ACCESS_TOKEN");
  if (fbPageId && fbToken) {
    collect(
      "facebook",
      "Facebook",
      (await checkAccount(
        "Facebook",
        fbPageId,
        fbToken,
        "name,category",
        ["pages_manage_posts", "pages_read_engagement"],
        app,
        fbPageId,
      )),
    );
  } else {
    console.log("Facebook: springes over (FB_PAGE_ID eller FB_PAGE_ACCESS_TOKEN mangler)");
  }

  const igUserId = readAccountEnv("instagram", "DK", "USER_ID");
  const igToken = readAccountEnv("instagram", "DK", "ACCESS_TOKEN");
  if (igUserId && igToken) {
    collect(
      "instagram",
      "Instagram",
      (await checkAccount(
        "Instagram",
        igUserId,
        igToken,
        "id,username",
        ["instagram_basic", "instagram_content_publish"],
        app,
      )),
    );
  } else {
    console.log("Instagram: springes over (IG_USER_ID eller IG_ACCESS_TOKEN mangler)");
  }

  for (const p of known) console.log(`\n· known, channel disabled: ${p.label}`);
  if (recovered.length) {
    console.log(
      `\n🟢 ${recovered.join(", ")}: the token now passes every check, but the channel is still in ` +
        "SOCIAL_DISABLED_CHANNELS — remove it from social-post.yml and meta-check.yml.",
    );
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `recovered=${recovered.join(", ")}\n`);
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
