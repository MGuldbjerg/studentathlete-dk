"use client";

import { useState } from "react";
import type { InstagramCandidate } from "@/lib/admin";
import { ADMIN_LANG, sportLabel } from "@/lib/i18n";

/**
 * One row = one click. The handle IS the button: it opens the profile in a new
 * tab and marks the row followed in the same gesture, because that is what the
 * gesture means. Opening 25 tabs from one button is what a popup blocker exists
 * to stop, so the list is the queue instead.
 *
 * Marking happens optimistically. The cost of a wrong mark is one athlete not
 * followed, and «fortryd» is right there — the cost of blocking the UI on a
 * round trip is felt 250 times.
 */
function CandidateRow({ candidate }: { candidate: InstagramCandidate }) {
  const [decided, setDecided] = useState<"followed" | "rejected" | null>(null);
  const [error, setError] = useState(false);

  async function decide(action: "followed" | "rejected") {
    const previous = decided;
    setDecided(action);
    setError(false);
    try {
      const res = await fetch(`/api/admin/instagram/${candidate.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        setDecided(previous);
        setError(true);
      }
    } catch {
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
        <button
          onClick={() => setDecided(null)}
          className="text-xs text-muted hover:text-ink underline"
        >
          Fortryd
        </button>
      </div>
    );
  }

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
        <a
          href={`https://www.instagram.com/${candidate.instagram_handle}/`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => decide("followed")}
          className="px-3 py-2 text-sm font-semibold text-white rounded-lg"
          style={{ backgroundColor: "#00205B" }}
        >
          @{candidate.instagram_handle} ↗
        </a>
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
        <h2 className="text-lg font-bold text-ink mb-1">
          Navnematch ({sure.length})
        </h2>
        <p className="text-sm text-muted mb-3">
          Handlen står på skolens egen side for atleten og bærer atletens navn. Klik
          for at åbne profilen — rækken markeres som fulgt med det samme.
        </p>
        <div className="bg-paper rounded-lg border border-border overflow-hidden">
          {sure.map((c) => (
            <CandidateRow key={c.id} candidate={c} />
          ))}
          {sure.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Ingen tilbage.</p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-ink mb-1">Til gennemsyn ({unsure.length})</h2>
        <p className="text-sm text-muted mb-3">
          Handlen stod på atletens bio-side, men bærer ikke navnet. Det kan være
          atletens eget kaldenavn — og det kan være en ven, en sponsor eller en
          holdkonto. Se profilen efter, før du følger.
        </p>
        <div className="bg-paper rounded-lg border border-border overflow-hidden">
          {unsure.map((c) => (
            <CandidateRow key={c.id} candidate={c} />
          ))}
          {unsure.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Ingen tilbage.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
