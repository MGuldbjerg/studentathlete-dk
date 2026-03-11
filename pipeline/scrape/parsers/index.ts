/**
 * Router der detekterer roster-platform og delegerer til den rette parser.
 */

import type { RosterEntry } from "../../lib/types";
import { isSidearm, parseSidearm } from "./sidearm";
import { parseGeneric } from "./generic";

export function parseRoster(html: string): RosterEntry[] {
  if (isSidearm(html)) return parseSidearm(html);
  return parseGeneric(html);
}
