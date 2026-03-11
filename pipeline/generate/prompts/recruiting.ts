/**
 * Prompt-skabelon for rekrutteringsnyheder (300-500 ord).
 */

import type { ArticleContext } from "./news";

export function recruitingPrompt(context: ArticleContext): string {
  return `Skriv en rekrutteringsnyhed (300-500 ord) baseret på følgende:

ATLET: ${context.athleteName}, ${context.sport}, ${context.university}
HJEMBY: ${context.hometown ?? "Ukendt"}
KILDE: ${context.sourceUrl}
OVERSKRIFT FRA KILDE: ${context.headline}
KILDEINDHOLD:
${context.content}

Artiklen skal:
- Have en overskrift i stilen "[Navn] skifter til [Universitet]" (maks 80 tegn)
- Starte med en ingress der annoncerer skiftet/rekrutteringen
- Fortælle om atletens baggrund i Danmark
- Beskrive universitetet og deres program i sporten
- Inkludere relevante detaljer om division, konference osv.
- Afslutte med hvad dette betyder for atletens karriere`;
}
