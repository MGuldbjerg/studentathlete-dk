"use client";

import { useState } from "react";
import type { InstagramCandidate } from "@/lib/admin";
import { ADMIN_LANG, sportLabel } from "@/lib/i18n";

/**
 * One row, but the two lists behave differently — because the question they ask
 * is different.
 *
 * On a NAME MATCH the handle carries the athlete's own name on the school's own
 * page, so opening it and following are the same intention: one click does both.
 *
 * ON REVIEW IT IS NOT. Mikkel, 16 September: «when reviewing and I press the
 * link, it looks like I accept that the handle is correct, but I need to follow
 * the link to check before deciding». Opening the profile is how you FIND OUT —
 * making that gesture a verdict is the opposite of what the list is for. So in
 * the review list the handle is an ordinary link and the verdict is a separate
 * button.
 */
function CandidateRow({
  candidate,
  followOnOpen,
}: {
  candidate: InstagramCandidate;
  followOnOpen: boolean;
}) {
  const [decided, setDecided] = useState<"followed" | "rejected" | null>(null);
  const [error, setError] = useState(false);

  async function send(action: "followed" | "rejected" | "undo"): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/instagram/${candidate.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          // Undoing a rejection: the row has lost the handle by then, so hand
          // back what is still on screen.
          handle: candidate.instagram_handle,
          confidence: candidate.instagram_confidence,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function decide(action: "followed" | "rejected") {
    setDecided(action);
    setError(false);
    if (!(await send(action))) {
      setDecided(null);
      setError(true);
    }
  }

  /** Undo reaches the database too — otherwise the next click fails the guard. */
  async function undo() {
    const previous = decided;
    setDecided(null);
    setError(false);
    if (!(await send("undo"))) {
      setDecided(previous);
      setError(true);
    }
  }

  if (decided) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border text-sm text-muted">
        <span>
          {candidate.name} — {decided === "followed" ? "✓ fulgt" : "afvist"}
        </span>
        <button onClick={undo} className="text-xs text-muted hover:text-ink underline">
          Fortryd
        </button>
      </div>
    );
  }

  const profileUrl = `https://www.instagram.com/${candidate.instagram_handle}/`;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{candidate.name}</p>
        <p className="text-xs text-muted truncate">
          {candidate.university} · {sportLabel(candidate.sport, ADMIN_LANG)}
          {candidate.bio_url ? (
            <>
              {" · "}
              <a
                href={candidate.bio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                bio-siden ↗
              </a>
            </>
          ) : null}
        </p>
        {error ? <p className="text-xs text-red-600">Kunne ikke gemmes — prøv igen</p> : null}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {followOnOpen ? (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => decide("followed")}
            className="px-3 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: "#00205B" }}
          >
            Følg @{candidate.instagram_handle} ↗
          </a>
        ) : (
          <>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
            >
              Se @{candidate.instagram_handle} ↗
            </a>
            <button
              onClick={() => decide("followed")}
              className="px-3 py-2 text-sm font-semibold text-white rounded-lg"
              style={{ backgroundColor: "#00205B" }}
            >
              Fulgt
            </button>
          </>
        )}
        <button
          onClick={() => decide("rejected")}
          className="px-3 py-2 text-xs font-medium rounded-lg border border-border bg-paper text-muted hover:text-ink"
          title="Handlen hører ikke til denne atlet"
        >
          Ikke atleten
        </button>
      </div>
    </div>
  );
}

export function InstagramClient({ candidates }: { candidates: InstagramCandidate[] }) {
  const sure = candidates.filter((c) => c.instagram_confidence === "name_match");
  const unsure = candidates.filter((c) => c.instagram_confidence !== "name_match");

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted">
        Ingen handles i kø. Kør «Find Instagram-handles» under Pipeline for at hente flere.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-bold text-ink mb-1">Navnematch ({sure.length})</h2>
        <p className="text-sm text-muted mb-3">
          Handlen står på skolens egen side for atleten og bærer atletens navn.
          Knappen gør begge dele: åbner profilen og markerer rækken som fulgt.
        </p>
        <div className="bg-paper rounded-lg border border-border overflow-hidden">
          {sure.map((c) => (
            <CandidateRow key={c.id} candidate={c} followOnOpen />
          ))}
          {sure.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Ingen tilbage.</p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-ink mb-1">Til gennemsyn ({unsure.length})</h2>
        <p className="text-sm text-muted mb-3">
          Handlen stod på atletens bio-side, men bærer ikke navnet. «Se» åbner
          profilen uden at afgøre noget — det er sådan du finder ud af det. Først
          bagefter vælger du «Fulgt» eller «Ikke atleten».
        </p>
        <div className="bg-paper rounded-lg border border-border overflow-hidden">
          {unsure.map((c) => (
            <CandidateRow key={c.id} candidate={c} followOnOpen={false} />
          ))}
          {unsure.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Ingen tilbage.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
