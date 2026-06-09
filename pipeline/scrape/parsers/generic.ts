/**
 * Generisk roster-parser.
 * Fallback der forsøger at parse standard HTML-tabeller med roster-data.
 * Leder efter tabeller med kolonner der ligner: Name, Position, Hometown, Year.
 */

import * as cheerio from "cheerio";
import type { RosterEntry } from "../../lib/types";

const NAME_HEADERS = ["name", "player", "athlete", "navn"];
const POS_HEADERS = ["pos", "position"];
const HOMETOWN_HEADERS = ["hometown", "city", "from", "hjemby"];
const YEAR_HEADERS = ["yr", "year", "class", "cl", "årgang"];

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase().trim();
  return keywords.some((kw) => lower.includes(kw));
}

export function parseGeneric(html: string): RosterEntry[] {
  const $ = cheerio.load(html);
  const players: RosterEntry[] = [];

  // Find tabeller der ligner en roster
  $("table").each((_, table) => {
    const headers: string[] = [];
    $(table)
      .find("thead th, thead td, tr:first-child th, tr:first-child td")
      .each((_, th) => {
        headers.push($(th).text().toLowerCase().trim());
      });

    // Tjek om tabellen har mindst en "name"-kolonne
    const nameIdx = headers.findIndex((h) => matchesAny(h, NAME_HEADERS));
    if (nameIdx === -1) return;

    const posIdx = headers.findIndex((h) => matchesAny(h, POS_HEADERS));
    const hometownIdx = headers.findIndex((h) =>
      matchesAny(h, HOMETOWN_HEADERS),
    );
    const yearIdx = headers.findIndex((h) => matchesAny(h, YEAR_HEADERS));

    // Parse rækker (spring header over)
    $(table)
      .find("tbody tr, tr:not(:first-child)")
      .each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length <= nameIdx) return;

        const name = cells.eq(nameIdx).text().trim();
        if (!name) return;

        players.push({
          name,
          position: posIdx >= 0 ? cells.eq(posIdx).text().trim() || null : null,
          hometown:
            hometownIdx >= 0
              ? cells.eq(hometownIdx).text().trim() || null
              : null,
          year:
            yearIdx >= 0 ? cells.eq(yearIdx).text().trim() || null : null,
          bioUrl: cells.eq(nameIdx).find("a").first().attr("href")?.trim() || null,
        });
      });
  });

  return players;
}
