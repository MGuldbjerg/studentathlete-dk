/**
 * Parser der konverterer Claude-output til strukturerede artikelfelter.
 * Forventer format:
 *   # Overskrift
 *   > Ingress
 *   Brødtekst...
 */

export interface ParsedArticle {
  title: string;
  summary: string;
  content: string;
  article_type: string;
}

export function parseArticleOutput(
  text: string,
  articleType: string = "news",
): ParsedArticle {
  const lines = text.split("\n");
  let title = "";
  let summary = "";
  const contentLines: string[] = [];
  let pastSummary = false;

  for (const line of lines) {
    // Første # linje = overskrift
    if (line.startsWith("# ") && !title) {
      title = line.replace(/^#\s+/, "").trim();
      continue;
    }

    // > linjer umiddelbart efter overskrift = ingress
    if (line.startsWith("> ") && !pastSummary && title) {
      const part = line.replace(/^>\s+/, "").trim();
      summary = summary ? `${summary} ${part}` : part;
      continue;
    }

    // Alt andet er brødtekst
    if (title) {
      pastSummary = true;
      contentLines.push(line);
    }
  }

  return {
    title: title || "Udkast uden titel",
    summary,
    content: contentLines.join("\n").trim(),
    article_type: articleType,
  };
}
