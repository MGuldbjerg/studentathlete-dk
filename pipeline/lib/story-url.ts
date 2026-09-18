/**
 * Nøglen der afgør, om en historie allerede er set.
 *
 * 18. september 2026 stod Nathan Hopley to gange i kladdekøen: samme turnering,
 * samme dag, samme kilde-artikel — den ene fundet som `http://kingtornado.com/…`
 * og den anden som `https://kingtornado.com/…`. Hashen blev lagt over den RÅ
 * adresse, så de to var forskellige historier, og begge blev skrevet.
 *
 * Derfor normaliseres adressen nu, før der hashes. Protokol og `www.` siger
 * intet om, hvilken side man er havnet på; det gør værten og stien.
 *
 * Og det var kun halvdelen: `INSERT OR IGNORE` i check-sources.ts lænede sig op
 * ad en unik nøgle, der ikke fandtes — `idx_stories_url_hash` var et almindeligt
 * indeks. Der var altså intet at ignorere, og afdubletteringen har aldrig
 * spærret noget. Migration 056 gør indekset unikt.
 */
import { createHash } from "crypto";

/**
 * Samme side → samme streng. Bevidst konservativ: kun protokol, `www.`,
 * store bogstaver i værten og en afsluttende skråstreg fjernes. Query-strenge
 * røres IKKE — på nogle sider er `?id=` hele artiklen.
 */
export function normalizeSourceUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const u = new URL(trimmed);
    const host = u.host.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}${u.search}`;
  } catch {
    // Ikke en adresse vi kan parse — brug den som den er, så bliver den i det
    // mindste sin egen nøgle i stedet for at kollidere med andre.
    return trimmed.toLowerCase();
  }
}

/** Historiens nøgle: atleten OG den normaliserede adresse. */
export function storyHash(athleteId: number | null, url: string): string {
  return createHash("sha256").update(`${athleteId}:${normalizeSourceUrl(url)}`).digest("hex");
}
