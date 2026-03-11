/**
 * Genererer URL-venlige slugs fra tekst.
 * Håndterer danske tegn (æ→ae, ø→oe, å→aa).
 */

const DANISH_MAP: Record<string, string> = {
  æ: "ae",
  ø: "oe",
  å: "aa",
  Æ: "ae",
  Ø: "oe",
  Å: "aa",
};

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[æøåÆØÅ]/g, (ch) => DANISH_MAP[ch] ?? ch)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Fjern accenter
    .replace(/[^a-z0-9]+/g, "-") // Ikke-alfanumeriske → bindestreg
    .replace(/^-+|-+$/g, "") // Trim bindestreger
    .replace(/-{2,}/g, "-"); // Kollapser dobbelte bindestreger
}
