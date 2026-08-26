/**
 * Parser for Sidearm Sports roster-sider.
 * Sidearm er den mest udbredte platform for NCAA atletiske afdelinger.
 * Roster-sider bruger typisk .sidearm-roster-player klasser.
 */

import * as cheerio from "cheerio";
import type { RosterEntry } from "../../lib/types";

export function isSidearm(html: string): boolean {
  return (
    html.includes("sidearm-roster") || html.includes("sidearmsports.com")
  );
}

/**
 * Hent kun den første direkte tekst-node fra et element.
 * Undgår at .text() konkatenerer nested child-tekst og giver duplikater.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function firstTextNode($: any, el: any): string {
  if (!el || el.length === 0) return "";
  // Forsøg at finde første direkte tekst-node
  const contents = el.contents();
  for (let i = 0; i < contents.length; i++) {
    const node = contents[i];
    if (node.type === "text") {
      const t = $(node).text().trim();
      if (t) return t;
    }
  }
  // Fallback: tag den første child-elements tekst
  const firstChild = el.children().first();
  if (firstChild.length) return firstChild.text().trim();
  return el.text().trim();
}

export function parseSidearm(html: string): RosterEntry[] {
  const $ = cheerio.load(html);
  const players: RosterEntry[] = [];

  // Primær selector: Sidearm roster player cards
  // NB: Sidearm HTML nester ofte tekst i child-spans, så .text() på containeren
  // kan give duplikeret output (fx "Denver, CODenver, CO"). Vi bruger
  // firstTextNode() til kun at hente den første tekst.
  $(".sidearm-roster-player").each((_, el) => {
    const name =
      $(el).find(".sidearm-roster-player-name a").first().text().trim() ||
      firstTextNode($, $(el).find(".sidearm-roster-player-name")) ||
      firstTextNode($, $(el).find('[class*="name"]').first());

    const position =
      firstTextNode($, $(el).find(".sidearm-roster-player-position")) ||
      firstTextNode($, $(el).find('[class*="position"]').first()) ||
      null;

    const hometown =
      firstTextNode($, $(el).find(".sidearm-roster-player-hometown")) ||
      firstTextNode($, $(el).find('[class*="hometown"]').first()) ||
      null;

    const year =
      firstTextNode($, $(el).find(".sidearm-roster-player-academic-year")) ||
      firstTextNode($, $(el).find('[class*="year"]').first()) ||
      null;

    // Officielt bio-link: anker på spillerens navn.
    const bioUrl =
      $(el).find(".sidearm-roster-player-name a").first().attr("href")?.trim() ||
      $(el).find('[class*="name"] a').first().attr("href")?.trim() ||
      null;

    if (name) {
      players.push({ name, position, hometown, year, bioUrl });
    }
  });

  // Fallback: Sidearm table-baserede rosters
  if (players.length === 0) {
    $("table.sidearm-table, table[class*='roster']").each((_, table) => {
      const headers: string[] = [];
      $(table)
        .find("thead th, thead td, tr:first-child th")
        .each((_, th) => {
          headers.push($(th).text());
        });
      const columns = mapColumns(headers);

      $(table)
        .find("tbody tr")
        .each((_, row) => {
          const cells = $(row).find("td");
          if (cells.length < 2) return;

          const cell = (idx: number | null): string | null => {
            if (idx === null || idx < 0 || idx >= cells.length) return null;
            const text = cells.eq(idx).text().trim();
            return text || null;
          };

          const name = cell(columns.name);
          if (!name || name === "Name") return;

          const bioUrl =
            (columns.name !== null
              ? cells.eq(columns.name).find("a").first().attr("href")?.trim()
              : undefined) || null;

          players.push({
            name,
            position: cell(columns.position),
            year: cell(columns.year),
            hometown: cell(columns.hometown),
            bioUrl,
          });
        });
    });
  }

  return players;
}

/** Kolonner vi kan bruge. `null` = kolonnen findes ikke i denne tabel. */
export interface RosterColumns {
  name: number | null;
  position: number | null;
  year: number | null;
  hometown: number | null;
}

/** Normalisér en overskrift: små bogstaver, ingen tegnsætning eller mellemrum. */
function normalizeHeader(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Find kolonnerne ud fra tabellens EGEN overskriftsrække.
 *
 * Her lå en rigtig fejl indtil 2026-08-26: kolonnerne var hardkodet til
 * `#, Name, Pos, Yr, Hometown` — mønstret på en holdsport-roster med
 * trøjenummer forrest. Iona University's golf-roster har ingen nummerkolonne
 * (`Name, Yr., Ht., Wt., Hometown / High School, Major`), så hver eneste
 * værdi rykkede én plads: Freddie Tucker blev indlæst som atleten "Jr." med
 * positionen "6-0" (hans højde) og årgangen "175" (hans vægt). Han lå på
 * sitet som en profil ved navn "Jr." i to uger.
 *
 * Overskrifterne matches PRÆCIST nok til at "Ht." (højde) ikke kan forveksles
 * med "Hometown", og "Wt." ikke med noget som helst.
 */
export function mapColumns(rawHeaders: string[]): RosterColumns {
  const headers = rawHeaders.map(normalizeHeader);

  const find = (test: (h: string) => boolean): number | null => {
    const idx = headers.findIndex(test);
    return idx === -1 ? null : idx;
  };

  const columns: RosterColumns = {
    name: find((h) => h === "name" || h === "player" || h === "athlete" || h === "fullname"),
    position: find((h) => h === "pos" || h === "position"),
    year: find((h) => h === "yr" || h === "cl" || h === "class" || h === "year" || h === "academicyear"),
    hometown: find((h) => h.startsWith("hometown") || h.startsWith("homecity")),
  };

  // Ingen brugbar overskrift (tabellen har intet thead) → det gamle mønster.
  // Det er stadig det rigtige gæt for en nummereret holdsport-roster.
  if (columns.name === null) {
    return { name: 1, position: 2, year: 3, hometown: 4 };
  }

  return columns;
}
