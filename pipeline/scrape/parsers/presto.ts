/**
 * Parser for PrestoSports' card roster ("headshot" view).
 *
 * Presto's newer roster pages show player cards, not a table, and the generic
 * table parser read nothing from them (Laramie County CC, 2026-10-08). Each
 * card carries the name as firstname/lastname spans and, on the card's back,
 * a labelled list: "Position:", "Class:", "Height:", "Hometown:". The
 * `?view=list` variant is no help — its table cells hold mobile labels.
 */

import * as cheerio from "cheerio";
import type { RosterEntry } from "../../lib/types";

export function isPrestoCards(html: string): boolean {
  return html.includes("player-card-wrapper") && html.includes("bio-card-name-and-year");
}

export function parsePrestoCards(html: string): RosterEntry[] {
  const $ = cheerio.load(html);
  const players: RosterEntry[] = [];

  $(".player-card-wrapper").each((_, el) => {
    const card = $(el);
    const front = card.find(".bio-card-name-and-year").first();
    const first = front.find(".firstname").first().text().trim();
    const last = front.find(".lastname").first().text().trim();
    const name = `${first} ${last}`.replace(/\s+/g, " ").trim();
    if (!name) return;

    const fields = new Map<string, string>();
    card.find(".bio-data li").each((_, li) => {
      const label = $(li).find(".fw-bold").first().text().replace(":", "").trim().toLowerCase();
      const value = $(li).clone().children(".fw-bold").remove().end().text().replace(/\s+/g, " ").trim();
      if (label && value) fields.set(label, value);
    });

    players.push({
      name,
      position: fields.get("position") ?? fields.get("pos") ?? null,
      hometown: fields.get("hometown") ?? null,
      year: fields.get("class") ?? fields.get("year") ?? fields.get("cl") ?? null,
      bioUrl: front.find("a[href]").first().attr("href") ?? card.find("a.full-bio").attr("href") ?? null,
    });
  });

  return players;
}
