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
  source_type: "athletics_page" | "rss" | "conference" | "google_news";
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
