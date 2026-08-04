/**
 * Registry over redigerbare site-tekster/indstillinger (Phase 2).
 * Defaults bor HER (kode-default); D1 (site_content) gemmer kun ændringer
 * (override). getSiteSettings() i admin.ts fletter D1 over disse defaults.
 *
 * Tilføj et nyt redigerbart felt = tilføj en linje her + brug værdien i en
 * server-komponent via getSiteSettings(). Ingen anden kode/admin-ændring nødvendig.
 */
export type SettingType = "text" | "textarea" | "bool";

/**
 * `site`   = værdien hører til ÉT site (dansk titel ≠ britisk titel).
 * `global` = samme værdi for alle sites (én AdSense-konto dækker begge domæner).
 *
 * Gemmes i `site_content` med henholdsvis landekoden og '*' (migration 037).
 */
export type SettingScope = "site" | "global";

/** Landekoden globale indstillinger gemmes under. */
export const GLOBAL_SCOPE = "*";

export interface SettingDef {
  key: string;
  group: string;
  label: string;
  type: SettingType;
  default: string;
  help?: string;
  /** Udeladt = "site". */
  scope?: SettingScope;
}

export function settingScope(key: string): SettingScope {
  return SITE_CONTENT.find((s) => s.key === key)?.scope ?? "site";
}

export const SITE_CONTENT: SettingDef[] = [
  {
    key: "site.title",
    group: "SEO",
    label: "Sidetitel (browserfane / standard)",
    type: "text",
    default: "StudentAthlete.dk – Dansk dækning af student athletes i USA",
  },
  {
    key: "site.description",
    group: "SEO",
    label: "Meta-beskrivelse (forside / standard)",
    type: "textarea",
    default:
      "Følg danske student athletes på amerikanske universiteter. Profiler, nyheder og sæsonopdateringer fra football, basketball, baseball og meget mere.",
  },
  {
    key: "footer.blurb",
    group: "Footer",
    label: "Footer-tekst (under logoet)",
    type: "textarea",
    default:
      "Danmarks dedikerede medie for danske student athletes i USA. Vi dækker profiler, nyheder og sæsonopdateringer.",
  },
  {
    key: "disclaimer.ai",
    group: "Ansvarsfraskrivelser",
    label: "Ai-disclaimer (bund af hver artikel)",
    type: "textarea",
    help: 'Vises før linket "Sådan bruger vi Ai".',
    default:
      "Denne artikel er skrevet af kunstig intelligens og gennemlæst af et menneske før udgivelse.",
  },
  {
    key: "consent.enabled",
    group: "Cookies & samtykke",
    label: "Vis cookie-samtykkeboks",
    type: "bool",
    help: "Slå TIL når annoncer/tracking-cookies aktiveres. Banneret vises kun når dette er slået til (sitet er ellers cookieløst).",
    default: "false",
    scope: "global",
  },
  {
    key: "adsense.publisher_id",
    group: "Annoncer",
    label: "AdSense publisher-ID",
    type: "text",
    help:
      "Fra AdSense (ca-pub-…). Udfylder BÅDE /ads.txt og verifikations-metatagget. " +
      "Tom = intet af delene udsendes. NB: dette viser IKKE annoncer — det beviser kun " +
      "at sitet er dit. Annoncer kræver NEXT_PUBLIC_ADS_ENABLED + samtykkeboksen slået til.",
    default: "",
    scope: "global",
  },
  {
    key: "adsense.enabled",
    group: "Annoncer",
    label: "Indlæs AdSense-scriptet",
    type: "bool",
    help:
      "TÆNDER annoncer (auto ads) OG Googles samtykkeboks — begge dele kommer med samme script. " +
      "Kræver at publisher-ID'et ovenfor er udfyldt. Sitet holder op med at være cookieløst når " +
      "denne slås til. Slå den fra igen for at fjerne alt Google-JS uden et deploy.",
    default: "false",
    scope: "global",
  },
];

export const SETTING_KEYS = new Set(SITE_CONTENT.map((s) => s.key));

/**
 * AdSense-ID'et skrives forskelligt de to steder det bruges:
 *  · metatagget vil have kontoformen  `ca-pub-123…`
 *  · ads.txt vil have sælger-formen   `pub-123…`  (uden ca-)
 * Mikkel skal kunne indsætte ID'et præcis som AdSense viser det, så
 * normaliseringen sker her i stedet for at være en regel han skal huske.
 */
export function adsenseIds(raw: string | undefined | null): {
  account: string;
  seller: string;
} | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const digits = v.replace(/^ca-/i, "").replace(/^pub-/i, "");
  if (!/^\d{10,25}$/.test(digits)) return null;
  return { account: `ca-pub-${digits}`, seller: `pub-${digits}` };
}

export function siteDefaults(): Record<string, string> {
  return Object.fromEntries(SITE_CONTENT.map((s) => [s.key, s.default]));
}
