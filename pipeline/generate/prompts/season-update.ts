/**
 * Prompt-skabelon for sæsonopdateringer (400-600 ord).
 */

import type { ArticleContext } from "./news";

export function seasonUpdatePrompt(context: ArticleContext): string {
  return `Skriv en sæsonopdatering (400-600 ord) baseret på følgende:

ATLET: ${context.athleteName}, ${context.sport}, ${context.university}${context.preferredName ? `\nFORETRUKKET NAVN (brug i overskrift og efter første omtale): ${context.preferredName}` : ""}
HJEMBY: ${context.hometown ?? "Ukendt"}
KILDE: ${context.sourceUrl}
OVERSKRIFT FRA KILDE: ${context.headline}
KILDEINDHOLD:
${context.content}

Artiklen skal:
- Være MINIMUM 400 ord
- Have en overskrift der opsummerer sæsonens status (maks 80 tegn)
- Starte med en kort ingress om atletens sæson indtil nu
- Inkludere nøglestatistikker og højdepunkter fra sæsonen
- Nævne øvrige relevante holdkammerater/modstandere hvor det giver kontekst
- Sammenligne med forrige sæson hvis data er tilgængeligt
- Nævne holdets samlede resultater som kontekst
- Væve kildehenvisning naturligt ind (fx "skriver universitetets hjemmeside")`;
}
