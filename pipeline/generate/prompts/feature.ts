/**
 * Prompt-skabelon for feature-artikler (800-1200 ord).
 * Bruges med Sonnet-modellen for bedre kvalitet.
 */

import type { ArticleContext } from "./news";

export function featurePrompt(context: ArticleContext): string {
  return `Skriv en feature-artikel (800-1200 ord) baseret på følgende:

ATLET: ${context.athleteName}, ${context.sport}, ${context.university}${context.preferredName ? `\nFORETRUKKET NAVN (brug i overskrift og efter første omtale): ${context.preferredName}` : ""}
HJEMBY: ${context.hometown ?? "Ukendt"}
KILDE: ${context.sourceUrl}
OVERSKRIFT FRA KILDE: ${context.headline}
KILDEINDHOLD:
${context.content}

Artiklen skal:
- Være MINIMUM 800 ord
- Have en stærk, narrativ overskrift (maks 80 tegn)
- Starte med en engagerende ingress (2-3 sætninger)
- Fortælle atletens historie med dansk vinkel
- Nævne øvrige relevante holdkammerater/modstandere hvor det giver kontekst
- Bruge ## underoverskrifter til at strukturere artiklen
- Sætte præstationerne i kontekst (hvad betyder det i sporten?)
- Inkludere relevante statistikker naturligt i teksten
- Væve kildehenvisning naturligt ind (fx "skriver universitetets hjemmeside")`;
}
