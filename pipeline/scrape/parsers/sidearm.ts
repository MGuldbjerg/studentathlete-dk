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

export function parseSidearm(html: string): RosterEntry[] {
  const $ = cheerio.load(html);
  const players: RosterEntry[] = [];

  // Primær selector: Sidearm roster player cards
  $(".sidearm-roster-player").each((_, el) => {
    const name =
      $(el).find(".sidearm-roster-player-name a").text().trim() ||
      $(el).find(".sidearm-roster-player-name").text().trim() ||
      $(el).find('[class*="name"]').first().text().trim();

    const position =
      $(el).find(".sidearm-roster-player-position").text().trim() ||
      $(el).find('[class*="position"]').first().text().trim() ||
      null;

    const hometown =
      $(el).find(".sidearm-roster-player-hometown").text().trim() ||
      $(el).find('[class*="hometown"]').first().text().trim() ||
      null;

    const year =
      $(el).find(".sidearm-roster-player-academic-year").text().trim() ||
      $(el).find('[class*="year"]').first().text().trim() ||
      null;

    if (name) {
      players.push({ name, position, hometown, year });
    }
  });

  // Fallback: Sidearm table-baserede rosters
  if (players.length === 0) {
    $("table.sidearm-table tbody tr, table[class*='roster'] tbody tr").each(
      (_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;

        // Typisk rækkefølge: #, Name, Pos, Yr, Hometown, HS
        const name = cells.eq(1).text().trim();
        const position = cells.length > 2 ? cells.eq(2).text().trim() : null;
        const year = cells.length > 3 ? cells.eq(3).text().trim() : null;
        const hometown = cells.length > 4 ? cells.eq(4).text().trim() : null;

        if (name && name !== "Name") {
          players.push({ name, position, hometown, year });
        }
      },
    );
  }

  return players;
}
