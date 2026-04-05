/**
 * Prompt-skabelon for rekrutteringsnyheder (300-500 ord).
 */

import type { ArticleContext } from "./news";

export function recruitingPrompt(context: ArticleContext): string {
  return `Skriv en rekrutteringsnyhed (300-500 ord) baseret på følgende:

ATLET: ${context.athleteName}, ${context.sport}, ${context.university}${context.preferredName ? `\nFORETRUKKET NAVN (brug i overskrift og efter første omtale): ${context.preferredName}` : ""}
HJEMBY: ${context.hometown ?? "Ukendt"}
KILDE: ${context.sourceUrl}
OVERSKRIFT FRA KILDE: ${context.headline}
KILDEINDHOLD:
${context.content}

Artiklen skal:
- Være MINIMUM 300 ord
- Have en overskrift i stilen "[Navn] skifter til [Universitet]" (maks 80 tegn)
- Starte med en ingress der annoncerer skiftet/rekrutteringen
- Beskrive universitetet og deres program i sporten
- Inkludere relevante detaljer om division, konference osv.
- Væve kildehenvisning naturligt ind (fx "oplyser universitetets atletikafdeling")`;
}
