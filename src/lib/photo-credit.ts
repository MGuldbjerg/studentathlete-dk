/**
 * The credit line next to a photo — what the permission email promises schools
 * (pipeline/photos/permission-email.ts): "next to the photo, we would name the
 * photographer where your site gives a name, along with '{School} Athletics',
 * and link to the source article."
 *
 * Pure, so the wording and link rules are testable without a DOM; the React
 * component (src/components/ui/PhotoCredit.tsx) only renders what this returns.
 * Plain inputs, no athlete object: article photos will use the same line.
 *
 *   photographer + school + url → "Foto: Jane Doe · Duke Athletics · [Kilde]"
 *   school + url               → "Foto: Duke Athletics · [Kilde]"
 *   legacy credit only         → "Foto: Duke Athletics"  (rows from before migration 080)
 *
 * Today's photos are roster headshots, which name no photographer, so the field is
 * empty. Mikkel, 2026-10-29: «once we get images, there should be photographers» —
 * the pipeline that takes photos from school ARTICLES must read the photographer
 * from the article's caption/credit and store it (photo_suggestions.photographer),
 * and should not suggest an article photo whose page names no one without saying so.
 */
import { t } from "./i18n";

export interface PhotoCreditInput {
  /** The photographer, when the school's page names one. */
  photographer?: string | null;
  /** The school's name; the credit becomes "{school} Athletics". */
  schoolName?: string | null;
  /**
   * A stored credit line (athletes.photo_credit). It wins over "{school} Athletics"
   * when it says something else, so a school's preferred credit line — typed in
   * admin — is what readers see. A leading "Foto:"/"Photo:" is dropped and re-added
   * in the page's language.
   */
  creditLine?: string | null;
  /** The page the photo came from. Only http(s) URLs are linked. */
  sourceUrl?: string | null;
  lang: string;
}

export interface PhotoCreditParts {
  /** The text before the link, e.g. "Foto: Jane Doe · Duke Athletics". Empty when nothing is known. */
  text: string;
  /** The source link, or null. */
  link: { href: string; label: string } | null;
}

/** Separator between the parts of the line. */
export const CREDIT_SEPARATOR = " · ";

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/** Only absolute http(s) links reach the page — never `javascript:` or a relative path. */
export function safeSourceUrl(url: string | null | undefined): string | null {
  const u = clean(url);
  if (!u) return null;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function photoCreditParts(input: PhotoCreditInput): PhotoCreditParts {
  const { lang } = input;
  const photographer = clean(input.photographer);
  const school = clean(input.schoolName);
  const stored = clean(input.creditLine).replace(/^(foto|photo)\s*:\s*/i, "");
  const schoolCredit = school ? t("photo.school_credit", lang, { school }) : "";

  // A stored line wins. For the default suggest-photos.ts writes ("Foto: Duke
  // Athletics") that is the same text; for a school's preferred line it is theirs.
  const holder = stored || schoolCredit;

  const names: string[] = [];
  // A photographer already inside a custom credit line is not repeated.
  if (photographer && !holder.toLowerCase().includes(photographer.toLowerCase())) names.push(photographer);
  if (holder) names.push(holder);

  const text = names.length ? t("photo.credit", lang, { credit: names.join(CREDIT_SEPARATOR) }) : "";
  const href = safeSourceUrl(input.sourceUrl);
  return { text, link: href ? { href, label: t("photo.source", lang) } : null };
}

/** The whole line as plain text (tests, alt text, feeds): "Foto: X · Y Athletics · Kilde". */
export function photoCreditText(input: PhotoCreditInput): string {
  const p = photoCreditParts(input);
  return [p.text, p.link?.label].filter(Boolean).join(CREDIT_SEPARATOR);
}
