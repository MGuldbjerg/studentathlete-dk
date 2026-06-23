"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AthleteEventRow } from "@/lib/athlete-events";

export function AthleteEventsEditor({
  athleteId,
  token,
  events,
}: {
  athleteId: number;
  token: string;
  events: AthleteEventRow[];
}) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [awardName, setAwardName] = useState("");
  const [season, setSeason] = useState("");
  const [significance, setSignificance] = useState("notable");
  const [kind, setKind] = useState("award");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const input = "w-full px-3 py-2 border border-border rounded-lg bg-paper text-ink text-sm";

  async function add() {
    if (!summary.trim()) {
      setMsg({ type: "err", text: "Beskrivelse er påkrævet" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/athlete-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          athlete_id: athleteId,
          summary: summary.trim(),
          award_name: awardName.trim() || null,
          season: season.trim() || null,
          significance,
          kind,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setMsg({ type: "err", text: b.error ?? "Noget gik galt" });
      } else {
        setSummary("");
        setAwardName("");
        setSeason("");
        router.refresh();
      }
    } catch {
      setMsg({ type: "err", text: "Netværksfejl" });
    } finally {
      setBusy(false);
    }
  }

  async function del(id: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/athlete-event", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-muted mb-1">
        Karriere-højdepunkter
      </h2>
      <p className="text-xs text-muted mb-3">
        Høstes automatisk fra publicerede artikler. Slet forkerte, eller tilføj selv.
      </p>

      {events.length === 0 && <p className="text-sm text-muted mb-3">Ingen begivenheder endnu.</p>}
      <ul className="flex flex-col gap-2 mb-4">
        {events.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-3 bg-paper border border-border rounded-lg px-3 py-2"
          >
            <span className="text-sm text-ink min-w-0">
              <span className="font-medium">{e.award_name ?? e.summary}</span>
              {e.season && <span className="text-muted"> · {e.season}</span>}
              <span className="text-xs text-muted"> · {e.significance}</span>
            </span>
            <button
              onClick={() => del(e.id)}
              disabled={busy}
              className="text-xs text-flag-red hover:underline disabled:opacity-50 flex-shrink-0"
            >
              Slet
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <input
          className={input}
          placeholder="Beskrivelse (fx All-American, 1. hold)"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className={input}
            placeholder="Pris-navn (fx All-American)"
            value={awardName}
            onChange={(e) => setAwardName(e.target.value)}
          />
          <input
            className={input}
            placeholder="Sæson (2025-26)"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select className={input} value={significance} onChange={(e) => setSignificance(e.target.value)}>
            <option value="honor">honor (år/karriere)</option>
            <option value="notable">notable (sæson)</option>
            <option value="routine">routine (uger)</option>
          </select>
          <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="award">award</option>
            <option value="championship">championship</option>
            <option value="record">record</option>
            <option value="transfer">transfer</option>
            <option value="other">other</option>
          </select>
        </div>
        {msg && (
          <p className={`text-sm ${msg.type === "ok" ? "text-green-700" : "text-flag-red"}`}>{msg.text}</p>
        )}
        <button
          onClick={add}
          disabled={busy}
          className="py-2.5 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#00205B" }}
        >
          {busy ? "…" : "Tilføj begivenhed"}
        </button>
      </div>
    </div>
  );
}
