/**
 * Prompt-skabelon for feature-artikler (800-1200 ord).
 * Bruges med Sonnet-modellen for bedre kvalitet.
 */

import type { ArticleContext } from "./news";

export function featurePrompt(context: ArticleContext): string {
  return `Skriv en feature-artikel (800-1200 ord) baseret på følgende:

ATLET: ${context.athleteName}, ${context.sport}, ${context.university}
HJEMBY: ${context.hometown ?? "Ukendt"}
KILDE: ${context.sourceUrl}
OVERSKRIFT FRA KILDE: ${context.headline}
KILDEINDHOLD:
${context.content}

Artiklen skal:
- Have en stærk, narrativ overskrift (maks 80 tegn)
- Starte med en engagerende ingress (2-3 sætninger)
- Fortælle atletens historie med dansk vinkel
- Bruge ## underoverskrifter til at strukturere artiklen
- Inkludere baggrundsinfo: hvor i Danmark atleten er fra, hvordan de endte i USA
- Sætte præstationerne i kontekst (hvad betyder det i sporten?)
- Inkludere relevante statistikker naturligt i teksten
- Afslutte med perspektiv: hvad er næste skridt for atleten?`;
}
