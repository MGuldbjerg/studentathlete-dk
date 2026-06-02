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
KILDEINDHOLD (brug KUN fakta herfra — tilføj intet der ikke fremgår):
${context.content || "[Kun overskriften er kendt — ingen yderligere kildetekst.]"}

Artiklen skal:
- Sigte efter 800-1200 ord NÅR kilden har substans nok til det; har kilden reelt kun en overskrift, skriv en kortere, faktuel artikel frem for at fylde op med opdigtet indhold
- Have en stærk, narrativ overskrift (maks 80 tegn)
- Starte med en engagerende ingress (2-3 sætninger)
- Fortælle atletens historie med dansk vinkel
- Nævne øvrige relevante holdkammerater/modstandere hvor det giver kontekst
- Bruge ## underoverskrifter til at strukturere artiklen
- Sætte præstationerne i kontekst (hvad betyder det i sporten?) — uden at opfinde fakta
- Inkludere statistikker KUN hvis de fremgår af kilden — opfind aldrig tal eller kampdetaljer
- Væve kildehenvisning naturligt ind (fx "skriver universitetets hjemmeside")`;
}
