/**
 * Pipeline-specifikke typer.
 * Core-typer (Article, Athlete, School) importeres fra websitens types.
 */

export type { Article, Athlete, School } from "../../src/lib/types";

export interface Source {
  id: number;
  athlete_id: number | null;
  school_id: number | null;
  url: string;
  source_type: "athletics_page" | "rss" | "conference";
  check_interval_hours: number;
  last_checked_at: string | null;
  last_found_at: string | null;
  active: number;
  created_at: string;
}

export interface Story {
  id: number;
  athlete_id: number | null;
  source_id: number | null;
  source_url: string;
  url_hash: string;
  headline: string | null;
  summary: string | null;
  content_raw: string | null;
  source_type: string;
  relevance_score: number;
  status:
    | "new"
    | "drafting"
    | "drafted"
    | "published"
    | "rejected"
    | "duplicate";
  discovered_at: string;
  processed_at: string | null;
}

export interface PipelineRun {
  id: number;
  run_type: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "completed" | "failed";
  items_processed: number;
  items_found: number;
  error_message: string | null;
}

export interface RosterEntry {
  name: string;
  position: string | null;
  hometown: string | null;
  year: string | null;
  /** Link til atletens officielle bio på skolens roster-side (rå href — opløses
   *  til absolut URL i scraperen mod skolens website). null hvis ingen anker. */
  bioUrl: string | null;
  /**
   * Køn, når KILDEN selv siger det. Kun JSON-API'et (`parsers/roster-api.ts`)
   * kan udfylde feltet; HTML-parserne lader det være udefineret, og scraperen
   * falder da tilbage på `genderFromTeamUrl()` som før. Optional, netop for at
   * de gamle parsere ikke skal ændres.
   */
  gender?: "m" | "f" | null;
  /**
   * Skolens egen angivelse af atletens FORRIGE skole — altså en transfer.
   * Kun JSON-API'et har feltet; HTML-parserne lader det være udefineret.
   *
   * Gemmes råt som skolen skriver det, inkl. flere skoler adskilt med "/"
   * («Texas Tech / Houston»). Uden det kan hverken vi eller en kladde vide, om
   * en junior er ny på HOLDET — årgangen siger det ikke.
   */
  previousSchool?: string | null;
}

export interface RosterCheck {
  id: number;
  school_id: number;
  sport: string;
  roster_url: string | null;
  status: "pending" | "success" | "empty" | "error" | "js_required";
  athletes_found: number;
  checked_at: string | null;
  error_message: string | null;
}
