/**
 * Registry over redigerbare site-tekster/indstillinger (Phase 2).
 * Defaults bor HER (kode-default); D1 (site_content) gemmer kun ændringer
 * (override). getSiteSettings() i admin.ts fletter D1 over disse defaults.
 *
 * Tilføj et nyt redigerbart felt = tilføj en linje her + brug værdien i en
 * server-komponent via getSiteSettings(). Ingen anden kode/admin-ændring nødvendig.
 */
export type SettingType = "text" | "textarea";

export interface SettingDef {
  key: string;
  group: string;
  label: string;
  type: SettingType;
  default: string;
  help?: string;
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
];

export const SETTING_KEYS = new Set(SITE_CONTENT.map((s) => s.key));

export function siteDefaults(): Record<string, string> {
  return Object.fromEntries(SITE_CONTENT.map((s) => [s.key, s.default]));
}
