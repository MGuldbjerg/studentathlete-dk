"use client";

import { useState } from "react";
import type { ProfileDraft, ProfileDraftEvent } from "@/lib/admin";

function DraftCard({
  draft,
  events,
}: {
  draft: ProfileDraft;
  events: ProfileDraftEvent[];
}) {
  const [text, setText] = useState(draft.profile_draft);
  const [busy, setBusy] = useState(false);
  const [decided, setDecided] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState(false);

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/profil/${draft.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text: text.trim() }),
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
        {draft.name} —{" "}
        {decided === "approved" ? "✓ godkendt, teksten vises nu på profilen" : "afvist"}
      </div>
    );
  }

  return (
    <div className="bg-paper rounded-lg border border-border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{draft.name}</p>
        <a
          href={`/atleter/${draft.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium hover:underline flex-shrink-0"
          style={{ color: "#00205B" }}
        >
          Profilen ↗
        </a>
      </div>
      <p className="text-xs text-muted mb-3">
        {draft.university} · {draft.sport}
      </p>

      {draft.profile_summary && (
        <div className="mb-3">
          <p className="text-xs text-muted mb-1">Nuværende tekst (erstattes):</p>
          <p className="text-xs text-ink bg-surface rounded p-2 border border-border">
            {draft.profile_summary}
          </p>
        </div>
      )}

      <label className="block text-xs text-muted mb-1">Udkast (kan redigeres)</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="w-full px-2 py-1.5 border border-border rounded bg-paper text-ink text-sm leading-relaxed"
      />

      {events.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-muted cursor-pointer select-none">
            Fakta-grundlag ({events.length} kildebelagte begivenheder)
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {events.map((e, i) => (
              <li key={i} className="text-xs text-ink">
                <span className="text-muted">[{e.season ?? "?"}]</span>{" "}
                {e.award_name ? `${e.award_name}: ` : ""}
                {e.summary}
                {e.source_url && (
                  <>
                    {" "}
                    <a
                      href={e.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      style={{ color: "#00205B" }}
                    >
                      kilde ↗
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => decide("approve")}
          disabled={busy || !text.trim()}
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
  );
}

export function ProfilerClient({
  drafts,
  events,
}: {
  drafts: ProfileDraft[];
  events: Record<number, ProfileDraftEvent[]>;
}) {
  if (drafts.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-8">
        Ingen profiludkast venter. Køen fyldes af pipelinen (build-profile-drafts).
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {drafts.map((d) => (
        <DraftCard key={d.id} draft={d} events={events[d.id] ?? []} />
      ))}
    </div>
  );
}
