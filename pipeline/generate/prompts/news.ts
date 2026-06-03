/**
 * Prompt-skabelon for korte nyheder (300-400 ord).
 * Bruges med Haiku-modellen for omkostningseffektivitet.
 */

export interface ArticleContext {
  athleteName: string;
  preferredName: string | null;
  sport: string;
  university: string;
  hometown: string | null;
  position?: string | null;
  division?: string | null;
  classYear?: string | null;
  expectedGraduation?: string | null;
  sourceUrl: string;
  headline: string;
  content: string;
}

/**
 * Formaterer de verificerede atlet-fakta (fra databasen) som promptens ATLET-blok.
 * Disse felter er kendte fakta — modellen må bruge dem (jf. system-regel 16).
 * Delt mellem alle artikeltyper for konsistens.
 */
export function athleteFactsBlock(context: ArticleContext): string {
  const sport = `${context.sport}${context.position ? ` (${context.position})` : ""}`;
  const uni = `${context.university}${context.division ? `, ${context.division}` : ""}`;
  const lines = [`ATLET: ${context.athleteName}, ${sport}, ${uni}`];
  if (context.preferredName) {
    lines.push(`FORETRUKKET NAVN (brug i overskrift og efter første omtale): ${context.preferredName}`);
  }
  lines.push(`HJEMBY: ${context.hometown ?? "Ukendt"}`);
  if (context.classYear || context.expectedGraduation) {
    lines.push(
      `ÅRGANG: ${context.classYear ?? "ukendt"}${context.expectedGraduation ? ` — forventet afgang ${context.expectedGraduation}` : ""}`,
    );
  }
  return lines.join("\n");
}

export function newsPrompt(context: ArticleContext): string {
  return `Skriv en kort nyhedsartikel (300-400 ord) baseret på følgende:

${athleteFactsBlock(context)}
KILDE: ${context.sourceUrl}
OVERSKRIFT FRA KILDE: ${context.headline}
KILDEINDHOLD (brug KUN fakta herfra — tilføj intet der ikke fremgår):
${context.content || "[Kun overskriften er kendt — ingen yderligere kildetekst.]"}

Artiklen skal:
- Have en passende længde: 300-400 ord hvis kilden har substans; ellers 150-250 ord — fyld ikke op med opdigtet indhold
- Have en fængende overskrift (maks 80 tegn)
- Starte med en kort ingress (1-2 sætninger der opsummerer historien)
- Forklare begivenheden med den danske atlet i centrum
- Nævne øvrige relevante holdkammerater/modstandere hvor det giver kontekst
- Inkludere statistikker KUN hvis de fremgår af kilden — opfind dem aldrig; udelad hvis de mangler
- Væve kildehenvisning naturligt ind (fx "skriver universitetets hjemmeside")`;
}
