"use client";

import { useState } from "react";
import type { ManualIssue } from "@/lib/admin-issues";

const SITE_LABELS: Record<string, string> = { DK: ".dk", UK: ".co.uk" };

export function SagerClient({ open: initialOpen, done: initialDone }: { open: ManualIssue[]; done: ManualIssue[] }) {
  const [open, setOpen] = useState(initialOpen);
  const [done, setDone] = useState(initialDone);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, note, link, country: country || null }),
      });
      const data = (await res.json()) as { issue?: ManualIssue; error?: string };
      if (!res.ok || !data.issue) throw new Error(data.error ?? "Kunne ikke gemme");
      setOpen((o) => [data.issue!, ...o]);
      setTitle(""); setNote(""); setLink(""); setCountry("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(issue: ManualIssue, status: "open" | "done") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sag/${issue.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Fejl");
      if (status === "done") {
        setOpen((o) => o.filter((i) => i.id !== issue.id));
        setDone((d) => [{ ...issue, status }, ...d]);
      } else {
        setDone((d) => d.filter((i) => i.id !== issue.id));
        setOpen((o) => [{ ...issue, status }, ...o]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={add} className="bg-paper rounded-lg border border-border p-4 mb-3 flex flex-col gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ny sag, fx «Svar fra WVU om Toby Mawer»"
          className="w-full rounded border border-border px-3 py-2 text-sm bg-surface text-ink" maxLength={200} />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (valgfri)" rows={2}
          className="w-full rounded border border-border px-3 py-2 text-sm bg-surface text-ink" />
        <div className="flex gap-2 flex-wrap">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (valgfrit): /admin/… eller https://…"
            className="flex-1 min-w-0 rounded border border-border px-3 py-2 text-sm bg-surface text-ink" />
          <select value={country} onChange={(e) => setCountry(e.target.value)}
            className="rounded border border-border px-2 py-2 text-sm bg-surface text-ink">
            <option value="">Begge sites</option>
            <option value="DK">Kun .dk</option>
            <option value="UK">Kun .co.uk</option>
          </select>
          <button type="submit" disabled={busy || !title.trim()}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: "#00205B" }}>
            Tilføj
          </button>
        </div>
        {error && <p className="text-sm" style={{ color: "#b91c1c" }}>{error}</p>}
      </form>

      {open.length === 0 ? (
        <p className="text-muted text-sm">Ingen åbne sager.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {open.map((i) => <IssueRow key={i.id} issue={i} busy={busy} onToggle={() => setStatus(i, "done")} action="Løst" />)}
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowDone((s) => !s)} className="text-sm text-muted hover:text-ink">
            {showDone ? "Skjul" : "Vis"} løste ({done.length})
          </button>
          {showDone && (
            <div className="flex flex-col gap-2 mt-2 opacity-70">
              {done.map((i) => <IssueRow key={i.id} issue={i} busy={busy} onToggle={() => setStatus(i, "open")} action="Genåbn" />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue, busy, onToggle, action }: { issue: ManualIssue; busy: boolean; onToggle: () => void; action: string }) {
  const external = issue.link?.startsWith("http");
  return (
    <div className="bg-paper rounded-lg border border-border p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-ink font-semibold text-sm ${issue.status === "done" ? "line-through" : ""}`}>{issue.title}</p>
          {issue.note && <p className="text-sm text-ink whitespace-pre-wrap mt-0.5">{issue.note}</p>}
          <p className="text-xs text-muted mt-1">
            {issue.created_at.slice(0, 10)}
            {issue.country ? ` · ${SITE_LABELS[issue.country] ?? issue.country}` : ""}
            {issue.link && (
              <>
                {" · "}
                <a href={issue.link} className="underline" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  åbn
                </a>
              </>
            )}
          </p>
        </div>
        <button type="button" onClick={onToggle} disabled={busy}
          className="shrink-0 px-3 py-1 text-xs font-semibold rounded border border-border bg-surface text-ink disabled:opacity-50">
          {action}
        </button>
      </div>
    </div>
  );
}
