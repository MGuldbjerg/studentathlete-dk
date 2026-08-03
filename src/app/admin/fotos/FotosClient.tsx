"use client";

import { useState } from "react";
import type { PhotoSuggestion } from "@/lib/admin";

import { sportLabel } from "@/lib/i18n";
function SuggestionCard({ suggestion }: { suggestion: PhotoSuggestion }) {
  const [credit, setCredit] = useState(suggestion.credit);
  const [busy, setBusy] = useState(false);
  const [decided, setDecided] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState(false);

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/foto/${suggestion.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, credit: credit.trim() }),
      });
      if (res.ok) {
        setDecided(action === "approve" ? "approved" : "rejected");
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (decided) {
    return (
      <div className="bg-paper rounded-lg border border-border p-4 text-sm text-muted">
        {suggestion.athlete_name} —{" "}
        {decided === "approved" ? "✓ godkendt, foto sat på profilen" : "afvist"}
      </div>
    );
  }

  return (
    <div className="bg-paper rounded-lg border border-border p-4">
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={suggestion.image_url}
          alt={suggestion.athlete_name}
          className="w-28 h-36 object-cover rounded border border-border flex-shrink-0 bg-surface"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{suggestion.athlete_name}</p>
          <p className="text-xs text-muted">
            {suggestion.university} · {sportLabel(suggestion.sport)}
          </p>
          <a
            href={suggestion.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium hover:underline"
            style={{ color: "#00205B" }}
          >
            Bio-siden (kilden) ↗
          </a>

          <label className="block text-xs text-muted mt-3 mb-1">Kreditering</label>
          <input
            type="text"
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
            className="w-full px-2 py-1.5 border border-border rounded bg-paper text-ink text-xs"
          />

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => decide("approve")}
              disabled={busy || !credit.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: "#065f46" }}
            >
              {busy ? "…" : "Godkend"}
            </button>
            <button
              onClick={() => decide("reject")}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-border bg-paper text-ink disabled:opacity-40"
            >
              Afvis
            </button>
          </div>
          {error && (
            <p className="text-xs mt-2" style={{ color: "#BF0A30" }}>
              Noget gik galt — prøv igen
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function FotosClient({
  suggestions,
}: {
  suggestions: PhotoSuggestion[];
}) {
  if (suggestions.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-8">
        Ingen foto-forslag venter. Køen fyldes af pipelinen (suggest-photos).
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {suggestions.map((s) => (
        <SuggestionCard key={s.id} suggestion={s} />
      ))}
    </div>
  );
}
