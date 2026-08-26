"use client";

import { useState } from "react";

// Klientkomponent: kan ikke selv slå sproget op (ingen request-kontekst), så
// teksterne kommer som props fra siden — samme mønster som SearchBar.
export function AlumniToggle({
  count,
  heading,
  showLabel,
  hideLabel,
  children,
}: {
  count: number;
  heading: string;
  showLabel: string;
  hideLabel: string;
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
          {heading}
        </h2>
        <span className="text-xs text-muted">({count})</span>
        <span className="text-muted text-sm group-hover:text-ink transition-colors">
          {open ? hideLabel : showLabel}
        </span>
      </button>
      {open && children}
    </>
  );
}
