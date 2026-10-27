"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REJECT_REASONS } from "@/lib/reject-reasons";

type Action = "publish" | "reject" | "line";

export function AdminActions({
  articleId,
  defaultLine = null,
  afterHref = "/admin",
}: {
  articleId: number;
  /** The profile line the draft would become (timelineLine); null when there's no athlete. */
  defaultLine?: string | null;
  /** Where to go once decided — the check view moves on to the next draft. */
  afterHref?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  // Mikkel, 2026-10-27: a reject asks WHY. The reasons teach the assignment
  // desk (pipeline/editor/brief.md); 178 rejects before this had none.
  // And a draft reviewed too late can become a profile line instead.
  const [mode, setMode] = useState<"buttons" | "reject" | "line">("buttons");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [line, setLine] = useState(defaultLine ?? "");

  async function send(action: Action) {
    setLoading(action);
    try {
      const body = action === "reject" ? { id: articleId, action, reason, note }
        : action === "line" ? { id: articleId, action, line }
        : { id: articleId, action };
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert((data as { error?: string }).error ?? "Noget gik galt");
        setLoading(null);
        return;
      }
      router.push(afterHref);
      router.refresh();
    } catch {
      alert("Netværksfejl — prøv igen");
      setLoading(null);
    }
  }

  function publish() {
    if (loading) return;
    if (!confirm("Er du sikker på at du vil godkende denne artikel?")) return;
    void send("publish");
  }

  const back = () => { setMode("buttons"); setReason(""); setNote(""); setLine(defaultLine ?? ""); };
  const btn = "flex-1 max-w-48 py-3 rounded-lg font-semibold transition-opacity disabled:opacity-50";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-paper border-t border-border p-4 z-50">
      {mode === "reject" && (
        <div className="max-w-md mx-auto mb-3 flex flex-col gap-2">
          <label className="text-sm font-semibold" htmlFor="reject-reason">Hvorfor afvises den?</label>
          <select
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border border-border rounded-lg p-2 bg-paper"
          >
            <option value="" disabled>Vælg en grund…</option>
            {REJECT_REASONS.map((r) => (
              <option key={r.code} value={r.code}>{r.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (valgfri)"
            maxLength={500}
            className="border border-border rounded-lg p-2 bg-paper"
          />
        </div>
      )}
      {mode === "line" && (
        <div className="max-w-md mx-auto mb-3 flex flex-col gap-2">
          <label className="text-sm font-semibold" htmlFor="profile-line">
            Linjen på profilen (går live med det samme — kun positive fakta)
          </label>
          <input
            id="profile-line"
            type="text"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            maxLength={300}
            className="border border-border rounded-lg p-2 bg-paper"
          />
        </div>
      )}
      <div className="flex gap-3 justify-center">
        {mode === "buttons" ? (
          <>
            <button onClick={() => setMode("reject")} disabled={loading !== null} className={`${btn} text-white`} style={{ backgroundColor: "#BF0A30" }}>
              Afvis…
            </button>
            {defaultLine !== null && (
              <button onClick={() => setMode("line")} disabled={loading !== null} className={`${btn} border border-border`}>
                Profillinje…
              </button>
            )}
            <button onClick={publish} disabled={loading !== null} className={`${btn} text-white`} style={{ backgroundColor: "#2D5A27" }}>
              {loading === "publish" ? "Godkender…" : "Godkend"}
            </button>
          </>
        ) : (
          <>
            <button onClick={back} disabled={loading !== null} className={`${btn} border border-border`}>
              Fortryd
            </button>
            {mode === "reject" ? (
              <button onClick={() => void send("reject")} disabled={loading !== null || !reason} className={`${btn} text-white`} style={{ backgroundColor: "#BF0A30" }}>
                {loading === "reject" ? "Afviser…" : "Afvis"}
              </button>
            ) : (
              <button onClick={() => void send("line")} disabled={loading !== null || !line.trim()} className={`${btn} text-white`} style={{ backgroundColor: "#2D5A27" }}>
                {loading === "line" ? "Gemmer…" : "Gem som linje"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
