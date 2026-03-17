"use client";

import { useState } from "react";

export function AlumniToggle({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 mb-6 group"
      >
        <h2
          className="text-xl font-bold text-ink"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Tidligere atleter
        </h2>
        <span className="text-xs text-muted">({count})</span>
        <span className="text-muted text-sm group-hover:text-ink transition-colors">
          {open ? "▲ Skjul" : "▼ Vis"}
        </span>
      </button>
      {open && children}
    </>
  );
}
