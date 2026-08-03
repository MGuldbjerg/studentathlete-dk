/**
 * URL-slugs. ÉN implementering for både site og pipeline.
 *
 * Der var to (src/lib/slug.ts og pipeline/lib/slug.ts) med hver sin adfærd —
 * kun `maxLength` skilte dem i praksis, men de kunne drive fra hinanden, og så
 * ville en omdøbning i /admin give en anden slug end scraperen selv ville have
 * valgt for samme navn.
 *
 * Translitterationstabellen kommer fra sprogpakken: dansk skriver ø→oe, tysk
 * ü→ue og ß→ss. Uden den ville NFD-normaliseringen nedenfor bare fjerne
 * accenten (ü→u), hvilket er forkert på begge sprog.
 */
import { languagePack } from "./i18n";

export function generateSlug(text: string, maxLength = 120, lang?: string): string {
  const { transliterate } = languagePack(lang);
  const chars = Object.keys(transliterate);
  const pattern = chars.length > 0 ? new RegExp(`[${chars.join("")}]`, "g") : null;

  let out = text.toLowerCase();
  if (pattern) out = out.replace(pattern, (ch) => transliterate[ch] ?? ch);

  return out
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Fjern resterende accenter
    .replace(/[^a-z0-9]+/g, "-") // Ikke-alfanumeriske → bindestreg
    .replace(/^-+|-+$/g, "") // Trim bindestreger
    .replace(/-{2,}/g, "-") // Kollaps dobbelte bindestreger
    .slice(0, maxLength);
}
