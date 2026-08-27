/**
 * ÉN artikel pr. (kilde, land).
 *
 * Mikkel, 2026-08-26: ét kampreferat gav tre britiske kladder — Macfarlane,
 * Steel og Holt — med næsten samme overskrift, og to af dem påstod at deres
 * spiller «fyrede Bonnies» til sejren, skønt det var Macfarlane der scorede
 * begge mål. Tvinges en perifer omtale ind i en enkeltmandsartikel, opfinder
 * modellen en hovedrolle til ham. Det er ikke en promptfejl, men en følge af
 * at bede om en artikel OM én person ud fra en kilde der handler om en kamp.
 *
 * LANDET er skillelinjen, ikke atleten: .dk og .co.uk er to sites med hvert
 * sit sprog og publikum, så samme kamp er to legitime artikler dér — men kun
 * én pr. site. Derfor grupperes på (source_url, home_country).
 *
 * Funktionen er ren og generisk, så den kan testes uden database.
 */

export interface GroupableStory {
  id: number;
  source_url: string;
  home_country: string | null;
  relevance_score: number;
}

export interface GroupedStories<T> {
  /** Historien der bærer artiklen — én pr. (kilde, land). */
  primaries: T[];
  /** primary.id → de øvrige historier samme artikel dækker. */
  companions: Map<number, T[]>;
}

export function groupBySourceAndCountry<T extends GroupableStory>(
  stories: T[],
): GroupedStories<T> {
  const groups = new Map<string, T[]>();
  for (const st of stories) {
    const key = `${st.source_url}::${st.home_country ?? ""}`;
    const g = groups.get(key);
    if (g) g.push(st);
    else groups.set(key, [st]);
  }

  const primaries: T[] = [];
  const companions = new Map<number, T[]>();
  for (const g of groups.values()) {
    // Højeste relevans bærer artiklen; id'et bryder uafgjort, så samme input
    // altid giver samme valg og en kørsel kan genskabes.
    g.sort((a, b) => b.relevance_score - a.relevance_score || a.id - b.id);
    primaries.push(g[0]);
    if (g.length > 1) companions.set(g[0].id, g.slice(1));
  }
  return { primaries, companions };
}
