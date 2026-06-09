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
    $("table.sidearm-table tbody tr, table[class*='roster'] tbody tr").each(
      (_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;

        // Typisk rækkefølge: #, Name, Pos, Yr, Hometown, HS
        const name = cells.eq(1).text().trim();
        const position = cells.length > 2 ? cells.eq(2).text().trim() : null;
        const year = cells.length > 3 ? cells.eq(3).text().trim() : null;
        const hometown = cells.length > 4 ? cells.eq(4).text().trim() : null;
        const bioUrl = cells.eq(1).find("a").first().attr("href")?.trim() || null;

        if (name && name !== "Name") {
          players.push({ name, position, hometown, year, bioUrl });
        }
      },
    );
  }

  return players;
}
