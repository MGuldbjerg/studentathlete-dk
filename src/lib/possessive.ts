/**
 * A first name in the possessive, by the site's language.
 *
 *   da: "Kirstines", "Thomas'", "Max'"  — names ending in s, x or z take an apostrophe only
 *   en: "Kirstine's", "James'"          — names ending in s take an apostrophe only
 *
 * Language is required (house rule: a forgotten argument must be a type error).
 */
export function possessive(name: string, lang: string): string {
  const n = name.trim();
  if (!n) return n;
  if (lang === "da") return /[sxz]$/i.test(n) ? `${n}'` : `${n}s`;
  return /s$/i.test(n) ? `${n}'` : `${n}'s`;
}

/** The first name used in reader-facing lines ("Støt Kirstine"). */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
