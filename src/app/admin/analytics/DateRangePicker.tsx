"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function toDateStr(d: Date): string {
  // Brug lokal dato (brugerens tidszone) for intuitive preset-beregninger
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

type Preset = {
  key: string;
  label: string;
  compute: () => { from: string; to: string };
};

function makePresets(): Preset[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [
    {
      key: "today",
      label: "I dag",
      compute: () => ({ from: toDateStr(today), to: toDateStr(today) }),
    },
    {
      key: "yesterday",
      label: "I går",
      compute: () => {
        const y = addDays(today, -1);
        return { from: toDateStr(y), to: toDateStr(y) };
      },
    },
    {
      key: "7d",
      label: "7 dage",
      compute: () => ({ from: toDateStr(addDays(today, -6)), to: toDateStr(today) }),
    },
    {
      key: "30d",
      label: "30 dage",
      compute: () => ({ from: toDateStr(addDays(today, -29)), to: toDateStr(today) }),
    },
    {
      key: "90d",
      label: "90 dage",
      compute: () => ({ from: toDateStr(addDays(today, -89)), to: toDateStr(today) }),
    },
    {
      key: "all",
      label: "Alt",
      compute: () => ({ from: "2020-01-01", to: toDateStr(today) }),
    },
  ];
}

interface Props {
  token: string;
  currentFrom: string;
  currentTo: string;
}

export function DateRangePicker({ token, currentFrom, currentTo }: Props) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(currentFrom);
  const [customTo, setCustomTo] = useState(currentTo);

  const presets = makePresets();

  function navigate(from: string, to: string) {
    const params = new URLSearchParams({ token, from, to });
    router.push(`/admin/analytics?${params.toString()}`);
  }

  function applyCustom() {
    if (customFrom && customTo && customFrom <= customTo) {
      navigate(customFrom, customTo);
    }
  }

  return (
    <div className="space-y-3">
      {/* Preset-knapper */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const { from, to } = p.compute();
          const isActive = from === currentFrom && to === currentTo;
          return (
            <button
              key={p.key}
              onClick={() => navigate(from, to)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                isActive
                  ? "bg-[#00205B] text-white border-[#00205B]"
                  : "bg-paper text-ink border-border hover:border-[#00205B]"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Tilpasset datointerval */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={customFrom}
          max={customTo || undefined}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="border border-border rounded px-2 py-1 text-sm bg-paper text-ink"
        />
        <span className="text-muted text-sm">–</span>
        <input
          type="date"
          value={customTo}
          min={customFrom || undefined}
          onChange={(e) => setCustomTo(e.target.value)}
          className="border border-border rounded px-2 py-1 text-sm bg-paper text-ink"
        />
        <button
          onClick={applyCustom}
          disabled={!customFrom || !customTo || customFrom > customTo}
          className="px-3 py-1.5 text-sm rounded-lg bg-paper border border-border text-ink hover:border-[#00205B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Anvend
        </button>
      </div>
    </div>
  );
}
