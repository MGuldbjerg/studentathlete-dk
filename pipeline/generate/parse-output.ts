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
    const t = line.trim();

    // Første IKKE-tomme linje = overskrift, uanset om modellen brugte "# ", "**fed**"
    // eller slet ingen markør. Robust mod gratis-modeller der ikke følger formatet
    // (ellers blev titlen "Udkast uden titel" → tom <h1> → dårlig SEO).
    if (!title) {
      if (!t) continue;
      title = stripHeadingMarkup(t);
      continue;
    }

    // > linjer umiddelbart efter overskrift = ingress (indtil brødteksten begynder)
    if (!pastSummary && t.startsWith(">")) {
      const part = t.replace(/^>\s*/, "").trim();
      if (part) summary = summary ? `${summary} ${part}` : part;
      continue;
    }

    // Spring tomme linjer mellem overskrift/ingress og brødtekst over
    if (!pastSummary && !t) continue;

    // Alt andet er brødtekst (bevar original linje, så afsnit/markdown bevares)
    pastSummary = true;
    contentLines.push(line);
  }

  return {
    title: title || "Udkast uden titel",
    summary,
    content: contentLines.join("\n").trim(),
    article_type: articleType,
  };
}

/**
 * Parser JSON-output ({"title","summary","content"}) fra structured-output-mode.
 * Returnerer null hvis teksten ikke er brugbar JSON — kalderen falder tilbage
 * til det linjebaserede format via parseArticleOutputSmart.
 */
export function parseArticleJson(
  text: string,
  articleType: string = "news",
): ParsedArticle | null {
  const stripped = text
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
  const m = stripped.match(/\{[\s\S]*\}/);
  if (!m) return null;

  let raw: { title?: unknown; summary?: unknown; content?: unknown };
  try {
    raw = JSON.parse(m[0]);
  } catch {
    return null;
  }

  const title = typeof raw.title === "string" ? stripHeadingMarkup(raw.title) : "";
  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  // Uden titel OG brødtekst er JSON'en ubrugelig — lad legacy-parseren prøve.
  if (!title || !content) return null;

  return {
    title,
    summary: typeof raw.summary === "string" ? raw.summary.trim() : "",
    content,
    article_type: articleType,
  };
}

/** JSON først (structured output), ellers det gamle linjebaserede format. */
export function parseArticleOutputSmart(
  text: string,
  articleType: string = "news",
): ParsedArticle {
  return parseArticleJson(text, articleType) ?? parseArticleOutput(text, articleType);
}

/** Fjern markdown-markører fra en titel-linje: #/##, >, **fed**, *kursiv*, _kursiv_, omsluttende citationstegn. */
function stripHeadingMarkup(s: string): string {
  let out = s.replace(/^#+\s*/, "").replace(/^>\s*/, "").trim();
  const wrapped =
    out.match(/^\*\*(.+?)\*\*$/) ?? out.match(/^\*(.+?)\*$/) ?? out.match(/^_(.+?)_$/);
  if (wrapped) out = wrapped[1].trim();
  return out.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
}
