/**
 * Prompt-skabelon for sæsonopdateringer (længde efter fakta, jf. regel 2).
 */

import { athleteFactsBlock, type ArticleContext } from "./news";
import { CLOSING_RULES_DA } from "./system";

export function seasonUpdatePrompt(context: ArticleContext): string {
  return `Skriv en sæsonopdatering baseret på følgende:

${athleteFactsBlock(context)}
KILDE: ${context.sourceUrl}
OVERSKRIFT FRA KILDE: ${context.headline}
KILDEINDHOLD (brug KUN fakta herfra — tilføj intet der ikke fremgår):
${context.content || "[Kun overskriften er kendt — ingen yderligere kildetekst.]"}

Artiklen skal:
- Følg regel 2 for længden: op til 400-600 ord kun når kilden har så meget substans
- Have en overskrift der opsummerer sæsonens status (maks 80 tegn)
- Starte med en kort ingress om atletens sæson indtil nu
- Inkludere nøglestatistikker og højdepunkter KUN hvis de fremgår af kilden
- Nævne øvrige relevante holdkammerater/modstandere hvor det giver kontekst
- IKKE sammenligne med tidligere sæsoner medmindre de konkrete tal står i kilden — opfind aldrig historiske data
- Nævne holdets samlede resultater KUN hvis de fremgår af kilden
- Væve kildehenvisning naturligt ind (fx "skriver universitetets hjemmeside")${CLOSING_RULES_DA}`;
}
