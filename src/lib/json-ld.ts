/**
 * JSON for a `<script type="application/ld+json">` block.
 *
 * `JSON.stringify` alone is not safe inside a script element: a string holding
 * `</script>` ends the element early, and whatever follows runs as HTML/JS. Our
 * structured data carries text we do not write ourselves — article titles and
 * summaries (Claude drafts from scraped school pages), athlete and school names
 * from rosters. Escaping `<`, `>`, `&` and the two JS line separators (U+2028,
 * U+2029) as \u sequences keeps the JSON identical to a parser and inert to the
 * HTML parser (2026-11-23, from the Skovkort review's "content is untrusted input").
 */
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LINE_SEP).join("\\u2028")
    .split(PARA_SEP).join("\\u2029");
}
