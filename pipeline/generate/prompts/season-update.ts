/**
 * Prompt-skabelon for sæsonopdateringer (400-600 ord).
 */

import type { ArticleContext } from "./news";

export function seasonUpdatePrompt(context: ArticleContext): string {
  return `Skriv en sæsonopdatering (400-600 ord) baseret på følgende:

ATLET: ${context.athleteName}, ${context.sport}, ${context.university}
HJEMBY: ${context.hometown ?? "Ukendt"}
KILDE: ${context.sourceUrl}
OVERSKRIFT FRA KILDE: ${context.headline}
KILDEINDHOLD:
${context.content}

Artiklen skal:
- Have en overskrift der opsummerer sæsonens status (maks 80 tegn)
- Starte med en kort ingress om atletens sæson indtil nu
- Inkludere nøglestatistikker og højdepunkter fra sæsonen
- Sammenligne med forrige sæson hvis data er tilgængeligt
- Nævne holdets samlede resultater som kontekst
- Afslutte med hvad der venter resten af sæsonen`;
}
