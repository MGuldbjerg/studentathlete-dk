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

/**
 * Træk det første JSON-objekt ud af et modelsvar der også kan indeholde tekst.
 *
 * Tåler at modellen skriver JSON inde i en ```json-blok, og at den skriver en
 * sætning før eller efter. Lå i to identiske kopier (save-review.ts og
 * apply-draft-fix.ts) indtil 2026-09-14 — de adskilte sig kun i returtypen.
 *
 * Returnerer null hvis der ikke er gyldig JSON. Kalderne gemmer IKKE på null:
 * en manglende gennemgang er bedre end en falsk.
 */
export function extractJson<T>(raw: string): T | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidates = [fenced?.[1], raw];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.indexOf("{");
    const end = c.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try {
      const v = JSON.parse(c.slice(start, end + 1));
      if (v && typeof v === "object") return v as T;
    } catch {
      // prøv næste kandidat
    }
  }
  return null;
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

/**
 * Ligner teksten et JSON-svar? Structured-output-mode BEDER om JSON, så en
 * indledende `{` (evt. i en kodeblok) betyder at modellen forsøgte formatet —
 * uanset om den nåede at lukke det igen.
 */
export function looksLikeJson(text: string): boolean {
  return /^\s*(?:```(?:json)?\s*)?\{/.test(text);
}

/**
 * JSON først (structured output), ellers det gamle linjebaserede format.
 *
 * `null` betyder «modellen forsøgte JSON og blev klippet af» — kalderen skal
 * kassere svaret, ikke redde det.
 *
 * AFBRUDT JSON MÅ ALDRIG NÅ LINJEPARSEREN. Den tager første ikke-tomme linje
 * som overskrift, og i et afkortet JSON-svar er den linje bogstaveligt «{».
 * `generateSlug("{")` er den TOMME streng, og `articles.slug` er UNIQUE — så
 * den første brudte kladde lægger beslag på den tomme slug, og hver eneste
 * senere kladde med samme brud dør på «UNIQUE constraint failed». Det var
 * #219, #247, #249 og #252, og 13. september fejlede historie 5153 og 4914 i
 * hver eneste kørsel af netop den grund. En kasseret kladde kan prøves igen;
 * en «{»-kladde spærrer for alle de andre.
 */
export function parseArticleOutputSmart(
  text: string,
  articleType: string = "news",
): ParsedArticle | null {
  const json = parseArticleJson(text, articleType);
  if (json) return json;
  if (looksLikeJson(text)) return null;
  return parseArticleOutput(text, articleType);
}

/** Fjern markdown-markører fra en titel-linje: #/##, >, **fed**, *kursiv*, _kursiv_, omsluttende citationstegn. */
function stripHeadingMarkup(s: string): string {
  let out = s.replace(/^#+\s*/, "").replace(/^>\s*/, "").trim();
  const wrapped =
    out.match(/^\*\*(.+?)\*\*$/) ?? out.match(/^\*(.+?)\*$/) ?? out.match(/^_(.+?)_$/);
  if (wrapped) out = wrapped[1].trim();
  return out.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
}
