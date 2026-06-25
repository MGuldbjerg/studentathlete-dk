"use client";

import { useState } from "react";
import type { AdminSchool } from "@/lib/admin";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function SchoolRow({ school }: { school: AdminSchool }) {
  const [primary, setPrimary] = useState(school.primary_color ?? "");
  const [secondary, setSecondary] = useState(school.secondary_color ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"ok" | "err" | null>(null);

  const dirty =
    primary !== (school.primary_color ?? "") || secondary !== (school.secondary_color ?? "");

  async function save() {
    for (const v of [primary, secondary]) {
      if (v && !HEX_RE.test(v)) {
        setStatus("err");
        return;
      }
    }
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/admin/skole/${school.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_color: primary || null,
          secondary_color: secondary || null,
        }),
      });
      setStatus(res.ok ? "ok" : "err");
    } catch {
      setStatus("err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-paper rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{school.name}</p>
          <p className="text-xs text-muted">
            {school.division ?? ""} · {school.athlete_count} atlet
            {school.athlete_count === 1 ? "" : "er"}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded flex-shrink-0 border border-border"
          style={{ backgroundColor: HEX_RE.test(primary) ? primary : "#e5e5e5" }}
          title="Forhåndsvisning af primærfarve"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 mt-3">
        <label className="text-xs text-muted flex flex-col gap-1">
          Primær
          <span className="flex items-center gap-1">
            <input
              type="color"
              value={HEX_RE.test(primary) ? primary : "#00205B"}
              onChange={(e) => setPrimary(e.target.value)}
              className="w-9 h-9 p-0 border border-border rounded cursor-pointer"
            />
            <input
              type="text"
              value={primary}
              onChange={(e) => setPrimary(e.target.value.trim())}
              placeholder="#1a2b3c"
              className="w-24 px-2 py-1.5 border border-border rounded bg-paper text-ink text-xs font-mono"
            />
          </span>
        </label>
        <label className="text-xs text-muted flex flex-col gap-1">
          Sekundær (valgfri)
          <span className="flex items-center gap-1">
            <input
              type="color"
              value={HEX_RE.test(secondary) ? secondary : "#BF0A30"}
              onChange={(e) => setSecondary(e.target.value)}
              className="w-9 h-9 p-0 border border-border rounded cursor-pointer"
            />
            <input
              type="text"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value.trim())}
              placeholder="#1a2b3c"
              className="w-24 px-2 py-1.5 border border-border rounded bg-paper text-ink text-xs font-mono"
            />
          </span>
        </label>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: "#00205B" }}
        >
          {saving ? "Gemmer…" : "Gem"}
        </button>
      </div>
      {status === "ok" && <p className="text-xs text-green-700 mt-2">Gemt</p>}
      {status === "err" && (
        <p className="text-xs mt-2" style={{ color: "#BF0A30" }}>
          Kunne ikke gemme — tjek at farver er #rrggbb
        </p>
      )}
    </div>
  );
}

export function SkolerClient({ schools }: { schools: AdminSchool[] }) {
  if (schools.length === 0) {
    return <p className="text-sm text-muted text-center py-8">Ingen skoler med aktive atleter.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {schools.map((s) => (
        <SchoolRow key={s.id} school={s} />
      ))}
    </div>
  );
}
