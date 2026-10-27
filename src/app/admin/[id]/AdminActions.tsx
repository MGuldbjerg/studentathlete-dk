"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REJECT_REASONS } from "@/lib/reject-reasons";

export function AdminActions({
  articleId,
  afterHref = "/admin",
}: {
  articleId: number;
  /** Where to go once decided — the check view moves on to the next draft. */
  afterHref?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"publish" | "reject" | null>(null);
  // Mikkel, 2026-10-27: a reject asks WHY. The reasons teach the assignment
  // desk (pipeline/editor/brief.md); 178 rejects before this had none.
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  async function send(action: "publish" | "reject") {
    setLoading(action);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { id: articleId, action, reason, note } : { id: articleId, action }),
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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-paper border-t border-border p-4 z-50">
      {rejecting && (
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
      <div className="flex gap-3 justify-center">
        {rejecting ? (
          <>
            <button
              onClick={() => { setRejecting(false); setReason(""); setNote(""); }}
              disabled={loading !== null}
              className="flex-1 max-w-48 py-3 rounded-lg font-semibold border border-border transition-opacity disabled:opacity-50"
            >
              Fortryd
            </button>
            <button
              onClick={() => void send("reject")}
              disabled={loading !== null || !reason}
              className="flex-1 max-w-48 py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#BF0A30" }}
            >
              {loading === "reject" ? "Afviser…" : "Afvis"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setRejecting(true)}
              disabled={loading !== null}
              className="flex-1 max-w-48 py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#BF0A30" }}
            >
              Afvis…
            </button>
            <button
              onClick={publish}
              disabled={loading !== null}
              className="flex-1 max-w-48 py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#2D5A27" }}
            >
              {loading === "publish" ? "Godkender…" : "Godkend"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
