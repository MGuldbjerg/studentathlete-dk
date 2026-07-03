"use client";

import { useState } from "react";
import type { Lead } from "@/lib/admin";

const STATUS_LABELS: Record<string, string> = {
  new: "Ny",
  contacted: "Kontaktet",
  forwarded: "Videresendt",
  closed: "Lukket",
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  new: { bg: "#dbeafe", fg: "#1e40af" },
  contacted: { bg: "#fef9c3", fg: "#854d0e" },
  forwarded: { bg: "#d1fae5", fg: "#065f46" },
  closed: { bg: "#e5e7eb", fg: "#374151" },
};

export function LeadsClient({ leads: initial }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);

  async function setStatus(id: number, status: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/lead/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
      }
    } finally {
      setBusy(null);
    }
  }

  if (leads.length === 0) {
    return (
      <p className="text-muted text-sm">
        Ingen leads endnu. Formularen er taget offline (kode i <code>src/app/_spil-i-usa</code> —
        omdøb mappen + <code>api/_lead</code> uden underscore for at genaktivere).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {leads.map((lead) => {
        const c = STATUS_COLORS[lead.status] ?? STATUS_COLORS.closed;
        return (
          <div key={lead.id} className="bg-paper rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded"
                style={{ backgroundColor: c.bg, color: c.fg }}
              >
                {STATUS_LABELS[lead.status] ?? lead.status}
              </span>
              <span className="font-semibold text-ink">{lead.name}</span>
              <a href={`mailto:${lead.email}`} className="text-sm text-muted underline">
                {lead.email}
              </a>
              {lead.sport && <span className="text-sm text-muted">· {lead.sport}</span>}
              <span className="text-xs text-muted ml-auto">{lead.created_at}</span>
            </div>
            {lead.message && (
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mb-2">{lead.message}</p>
            )}
            <p className="text-xs text-muted mb-3">
              Attribution: {lead.source_path ?? "ukendt sti"}
              {lead.referrer ? ` · via ${lead.referrer}` : ""}
            </p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS_LABELS)
                .filter(([s]) => s !== lead.status)
                .map(([s, label]) => (
                  <button
                    key={s}
                    onClick={() => setStatus(lead.id, s)}
                    disabled={busy === lead.id}
                    className="px-3 py-1.5 text-xs font-semibold rounded border border-border bg-surface text-ink hover:bg-paper transition-colors disabled:opacity-50"
                  >
                    → {label}
                  </button>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
