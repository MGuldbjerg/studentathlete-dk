/**
 * Kontoregisteret: ét sted der ved hvilke konti der findes, og hvad de hedder.
 * ===========================================================================
 *
 * Målet er at **et nyt marked ikke kræver kode**. I dag står kanalerne i en
 * håndholdt liste, og `facebook.ts`/`instagram.ts` er hårdkodet `country: "DK"`,
 * så UK har kun Bluesky. Med registeret her er en ny konto: opret den, sæt
 * secrets'ene, færdig.
 *
 * ⚠️ **KANALNAVNET ER EN DATABASEVÆRDI, IKKE EN ETIKET.** `social_posts.channel`
 * gemmer det, og pacingen, kø-dybden, «hvornår postede vi sidst» og
 * dubletsikringen (`INSERT OR IGNORE` på article_id+channel) slår alle op på
 * det. Omdøbes en eksisterende kanal, mister den sin historik, pacingen tror
 * den aldrig har postet, og HELE arkivet bliver lagt i kø igen. Derfor beholder
 * de fire kanaler der fandtes før 22. september 2026 deres gamle navne, også
 * selvom navnene er usymmetriske (`bluesky` er dansk, `bluesky_uk` britisk).
 * Nye konti får det symmetriske `<platform>_<land>`.
 *
 * Secret-navnene har den samme historie, men uden databasen til at binde dem:
 * de nye, symmetriske navne vinder, og de gamle virker videre som reserve. Så
 * kan de skiftes ét ad gangen frem for i ét spring.
 */

import { COUNTRIES } from "../../src/lib/countries";
import type { Platform } from "./types";

/** Platformene med en adapter. Threads hører til her, når den bygges. */
export const SOCIAL_PLATFORMS: Platform[] = ["bluesky", "facebook", "instagram"];

/** Præfikset i secret-navne. `FB`/`IG` er de navne der allerede står i GitHub. */
const ENV_PREFIX: Record<Platform, string> = {
  bluesky: "BLUESKY",
  facebook: "FB",
  instagram: "IG",
  x: "X",
};

/** Felterne hver platform skal bruge for at kunne poste. */
export const PLATFORM_FIELDS: Record<Platform, string[]> = {
  bluesky: ["HANDLE", "APP_PASSWORD"],
  facebook: ["PAGE_ID", "PAGE_ACCESS_TOKEN"],
  instagram: ["USER_ID", "ACCESS_TOKEN"],
  x: ["API_KEY", "API_SECRET", "ACCESS_TOKEN", "ACCESS_TOKEN_SECRET"],
};

/**
 * Kanalnavne fra før registeret. Se advarslen øverst: de er databaseværdier.
 *
 * Bemærk usymmetrien — `bluesky` er den DANSKE konto. Den er ikke pæn, og den
 * bliver stående, fordi prisen for at rette den er hele kanalens historik.
 */
const LEGACY_CHANNEL_NAMES: Record<string, string> = {
  "bluesky:DK": "bluesky",
  "bluesky:UK": "bluesky_uk",
  "facebook:DK": "facebook",
  "instagram:DK": "instagram",
  "x:DK": "x",
};

/**
 * Secret-navne fra før registeret. Kun de konti der allerede havde nogle.
 *
 * Disse er IKKE databaseværdier, så de må gerne dø — men først når de nye er
 * sat. Derfor reserve, ikke erstatning.
 */
const LEGACY_ENV_NAMES: Record<string, string> = {
  "bluesky:DK:HANDLE": "BLUESKY_HANDLE",
  "bluesky:DK:APP_PASSWORD": "BLUESKY_APP_PASSWORD",
  "bluesky:UK:HANDLE": "BLUESKY_UK_HANDLE",
  "bluesky:UK:APP_PASSWORD": "BLUESKY_UK_APP_PASSWORD",
  "facebook:DK:PAGE_ID": "FB_PAGE_ID",
  "facebook:DK:PAGE_ACCESS_TOKEN": "FB_PAGE_ACCESS_TOKEN",
  "instagram:DK:USER_ID": "IG_USER_ID",
  "instagram:DK:ACCESS_TOKEN": "IG_ACCESS_TOKEN",
  "x:DK:API_KEY": "X_API_KEY",
  "x:DK:API_SECRET": "X_API_SECRET",
  "x:DK:ACCESS_TOKEN": "X_ACCESS_TOKEN",
  "x:DK:ACCESS_TOKEN_SECRET": "X_ACCESS_TOKEN_SECRET",
};

/** Kanalens navn i databasen. Gamle konti beholder deres; nye er symmetriske. */
export function channelNameFor(platform: Platform, country: string): string {
  const cc = country.toUpperCase();
  return LEGACY_CHANNEL_NAMES[`${platform}:${cc}`] ?? `${platform}_${cc.toLowerCase()}`;
}

/** Det symmetriske secret-navn: `FB_UK_PAGE_ID`, `BLUESKY_DK_HANDLE`. */
export function envNameFor(platform: Platform, country: string, field: string): string {
  return `${ENV_PREFIX[platform]}_${country.toUpperCase()}_${field}`;
}

/** Det gamle navn, hvis kontoen havde et. */
export function legacyEnvNameFor(platform: Platform, country: string, field: string): string | null {
  return LEGACY_ENV_NAMES[`${platform}:${country.toUpperCase()}:${field}`] ?? null;
}

/**
 * Værdien, nyt navn før gammelt.
 *
 * Rækkefølgen er hele migrationsplanen: sæt `FB_DK_PAGE_ACCESS_TOKEN`, og den
 * vinder over `FB_PAGE_ACCESS_TOKEN` uden at noget skal deployes. Når alle nye
 * er sat, kan de gamle slettes uden at røre kode.
 */
export function readAccountEnv(platform: Platform, country: string, field: string): string | undefined {
  const fresh = process.env[envNameFor(platform, country, field)];
  if (fresh) return fresh;
  const legacy = legacyEnvNameFor(platform, country, field);
  return legacy ? process.env[legacy] : undefined;
}

/** Har kontoen alle sine secrets? Uden dem må kanalen ikke findes. */
export function accountIsConfigured(platform: Platform, country: string): boolean {
  return PLATFORM_FIELDS[platform].every((f) => Boolean(readAccountEnv(platform, country, f)));
}

export interface SocialAccount {
  platform: Platform;
  country: string;
  /** Navnet i `social_posts.channel`. */
  channel: string;
}

/**
 * Alle konti der KUNNE findes — ikke dem der er sat op.
 *
 * Konfigurationen tjekkes ét sted (`accountIsConfigured`), så en konto uden
 * secrets forsvinder ét sted og ikke tre. Landene kommer fra landeregistret, så
 * et nyt land i `COUNTRIES` giver sine konti gratis.
 */
export function allAccounts(platforms: Platform[] = SOCIAL_PLATFORMS): SocialAccount[] {
  const accounts: SocialAccount[] = [];
  for (const country of Object.keys(COUNTRIES)) {
    for (const platform of platforms) {
      accounts.push({ platform, country, channel: channelNameFor(platform, country) });
    }
  }
  return accounts;
}
