/**
 * Prompt-skabelon for rekrutteringsnyheder (300-500 ord).
 */

import { athleteFactsBlock, type ArticleContext } from "./news";

export function recruitingPrompt(context: ArticleContext): string {
  return `Skriv en rekrutteringsnyhed (300-500 ord) baseret på følgende:

${athleteFactsBlock(context)}
KILDE: ${context.sourceUrl}
OVERSKRIFT FRA KILDE: ${context.headline}
KILDEINDHOLD (brug KUN fakta herfra — tilføj intet der ikke fremgår):
${context.content || "[Kun overskriften er kendt — ingen yderligere kildetekst.]"}

Artiklen skal:
- Have en passende længde: 300-500 ord hvis kilden har substans; ellers 150-250 ord — fyld ikke op med opdigtet indhold
- Have en overskrift i stilen "[Navn] skifter til [Universitet]" (maks 80 tegn)
- Starte med en ingress der annoncerer skiftet/rekrutteringen
- Nævne universitetet og sporten som de fremgår af ATLET-blokken — opfind ikke detaljer om programmets historie, faciliteter, træner el.lign.
- Nævne division/konference KUN hvis det fremgår af kilden — gæt ikke
- Væve kildehenvisning naturligt ind (fx "oplyser universitetets atletikafdeling")`;
}
