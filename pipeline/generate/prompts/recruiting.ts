/**
 * Prompt-skabelon for rekrutteringsnyheder (længde efter fakta, jf. regel 2).
 */

import { athleteFactsBlock, type ArticleContext } from "./news";
import { CLOSING_RULES_DA } from "./system";

export function recruitingPrompt(context: ArticleContext): string {
  return `Skriv en rekrutteringsnyhed baseret på følgende:

${athleteFactsBlock(context)}
KILDE: ${context.sourceUrl}
OVERSKRIFT FRA KILDE: ${context.headline}
KILDEINDHOLD (brug KUN fakta herfra — tilføj intet der ikke fremgår):
${context.content || "[Kun overskriften er kendt — ingen yderligere kildetekst.]"}

Artiklen skal:
- Følg regel 2 for længden: typisk 100-250 ord; mere kun når kilden har så meget substans
- Have en overskrift i stilen "[Navn] skifter til [Universitet]" (maks 80 tegn)
- Starte med en ingress der annoncerer skiftet/rekrutteringen
- Nævne universitetet og sporten som de fremgår af ATLET-blokken — opfind ikke detaljer om programmets historie, faciliteter, træner el.lign.
- Nævne division/konference KUN hvis det fremgår af kilden — gæt ikke
- Væve kildehenvisning naturligt ind (fx "oplyser universitetets atletikafdeling")${CLOSING_RULES_DA}`;
}
