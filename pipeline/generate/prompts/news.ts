/**
 * Prompt-skabelon for korte nyheder (300-400 ord).
 * Bruges med Haiku-modellen for omkostningseffektivitet.
 */

export interface ArticleContext {
  athleteName: string;
  sport: string;
  university: string;
  hometown: string | null;
  sourceUrl: string;
  headline: string;
  content: string;
}

export function newsPrompt(context: ArticleContext): string {
  return `Skriv en kort nyhedsartikel (300-400 ord) baseret på følgende:

ATLET: ${context.athleteName}, ${context.sport}, ${context.university}
HJEMBY: ${context.hometown ?? "Ukendt"}
KILDE: ${context.sourceUrl}
OVERSKRIFT FRA KILDE: ${context.headline}
KILDEINDHOLD:
${context.content}

Artiklen skal:
- Have en fængende overskrift (maks 80 tegn)
- Starte med en kort ingress (1-2 sætninger der opsummerer historien)
- Forklare begivenheden med den danske atlet i centrum
- Inkludere relevante statistikker fra kilden
- Afslutte med kontekst om atletens sæson eller karriere`;
}
