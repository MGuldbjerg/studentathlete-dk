/**
 * Router der detekterer roster-platform og delegerer til den rette parser.
 */

import type { RosterEntry } from "../../lib/types";
import { isSidearm, parseSidearm } from "./sidearm";
import { parseGeneric } from "./generic";

export function parseRoster(html: string): RosterEntry[] {
  // Sidearm-sider findes i flere layouts. parseSidearm fanger kort-/liste-layoutet,
  // men mange Sidearm-sider bruger et tabel-layout den returnerer 0 rækker for.
  // Fald tilbage til den generiske tabel-parser i de tilfælde (ellers markeres en
  // fuldt hentbar roster fejlagtigt som 'error' — ~2.300 checks ramt af dette).
  if (isSidearm(html)) {
    const rows = parseSidearm(html);
    if (rows.length > 0) return rows;
  }
  return parseGeneric(html);
}
