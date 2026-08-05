/**
 * Opdeling af artikelindhold i blokke.
 *
 * Lå før inde i `ArticleBody` som `content.split(/\n\n+/)` — altså: kun en TOM
 * LINJE kunne afslutte en blok. Skrev modellen
 *
 *     ## Overskrift
 *     Første afsnit …
 *
 * uden den tomme linje, blev hele afsnittet en del af `<h2>`'et. Hele sektioner
 * blev vist som overskrifter (fanget på den første britiske kladde 2026-08-05).
 *
 * Vi kan ikke kræve at en gratis sprogmodel altid husker den tomme linje, og vi
 * skal ikke rette i kladden for at kompensere. Renderen skal bare læse markdown
 * som markdown: **en overskriftslinje er sin egen blok**, med eller uden tom
 * linje omkring sig.
 */

/** En overskriftslinje: `# `, `## ` eller `### `. */
const HEADING = /^\s{0,3}#{1,3}\s+\S/;
/** En citatlinje: `> `. */
const QUOTE = /^\s{0,3}>\s?/;

/**
 * Del indholdet i blokke. Tomme linjer deler som før; derudover afsluttes en
 * blok af en overskriftslinje, og en overskrift står altid alene.
 *
 * Citater grupperes med de citatlinjer der følger umiddelbart efter, så et
 * flerlinjet citat bliver ét blockquote og ikke tre.
 */
export function splitArticleBlocks(content: string): string[] {
  const blocks: string[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) blocks.push(text);
    buffer = [];
  };

  for (const line of content.split("\n")) {
    if (!line.trim()) {
      flush();
      continue;
    }
    const isHeading = HEADING.test(line);
    const isQuote = QUOTE.test(line);
    const bufferIsQuote = buffer.length > 0 && QUOTE.test(buffer[0]);

    if (isHeading) {
      // Overskriften afslutter det foregående OG står alene.
      flush();
      blocks.push(line.trim());
      continue;
    }

    // Et citat må ikke smelte sammen med brødteksten omkring det.
    if (isQuote !== bufferIsQuote && buffer.length > 0) flush();

    buffer.push(line);
  }
  flush();

  return blocks;
}
