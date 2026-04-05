/**
 * Genererer URL-venlige slugs fra tekst.
 * Håndterer danske tegn (æ→ae, ø→oe, å→aa) og accenter.
 */

const DANISH_MAP: Record<string, string> = {
  æ: "ae", ø: "oe", å: "aa",
  Æ: "ae", Ø: "oe", Å: "aa",
};

export function generateSlug(text: string, maxLength = 120): string {
  return text
    .toLowerCase()
    .replace(/[æøåÆØÅ]/g, (ch) => DANISH_MAP[ch] ?? ch)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, maxLength);
}
