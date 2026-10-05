"use client";

/**
 * Small SVG line chart for the admin dashboard — no chart library.
 *
 * Marks: 2px lines, round joins, hairline solid grid, one y-axis. With 2+
 * series there is a legend AND an end label per line, so identity never rests
 * on colour alone. Hover: a crosshair snaps to the nearest day and a tooltip
 * lists every series' value. A table view sits under the chart.
 *
 * Colours are the validated categorical slots 1-2 (blue, orange) on white;
 * the order is fixed by the caller, never by rank.
 */

import { useMemo, useState } from "react";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  points: { day: string; value: number }[];
}

const W = 640;
const PAD = { top: 12, right: 64, bottom: 24, left: 36 };

function niceMax(v: number): number {
  if (v <= 5) return 5;
  const mag = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= v / 4)! * mag;
  return Math.ceil(v / step) * step;
}

function shortDay(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(d)}/${Number(m)}`;
}

export function LineChart({
  series,
  height = 200,
  emptyText = "Ingen data i dette interval",
}: {
  series: ChartSeries[];
  height?: number;
  emptyText?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const days = useMemo(
    () => [...new Set(series.flatMap((s) => s.points.map((p) => p.day)))].sort(),
    [series],
  );
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.value))));

  if (days.length === 0) return <p className="p-4 text-sm text-muted">{emptyText}</p>;

  const H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (days.length === 1 ? innerW / 2 : (i / (days.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(days.length / 6));

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * innerW;
    const i = days.length === 1 ? 0 : Math.round((px / innerW) * (days.length - 1));
    setHover(Math.min(days.length - 1, Math.max(0, i)));
  }

  const hoverDay = hover !== null ? days[hover] : null;

  return (
    <div>
      {series.length >= 2 && (
        <div className="flex gap-4 px-4 pt-3 text-xs text-muted">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 rounded" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Linjediagram">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#E2E0DC" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#6B6B6B">
                {Math.round(t).toLocaleString("da-DK")}
              </text>
            </g>
          ))}
          {days.map((d, i) =>
            i % labelEvery === 0 || i === days.length - 1 ? (
              <text key={d} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="#6B6B6B">
                {shortDay(d)}
              </text>
            ) : null,
          )}
          {series.map((s) => {
            const pts = s.points.map((p) => `${x(days.indexOf(p.day))},${y(p.value)}`).join(" ");
            const last = s.points[s.points.length - 1];
            return (
              <g key={s.key}>
                <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {s.points.length === 1 && <circle cx={x(days.indexOf(last.day))} cy={y(last.value)} r={4} fill={s.color} />}
                {last && (
                  <text x={x(days.indexOf(last.day)) + 6} y={y(last.value) + 4} fontSize={11} fill="#111111">
                    {series.length >= 2 ? `${s.label} ` : ""}
                    {last.value.toLocaleString("da-DK")}
                  </text>
                )}
              </g>
            );
          })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="#6B6B6B" strokeWidth={1} />
              {series.map((s) => {
                const p = s.points.find((q) => q.day === hoverDay);
                return p ? (
                  <circle key={s.key} cx={x(hover)} cy={y(p.value)} r={4} fill={s.color} stroke="#ffffff" strokeWidth={2} />
                ) : null;
              })}
            </g>
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
        {hover !== null && hoverDay && (
          <div
            className="absolute top-2 pointer-events-none bg-paper border border-border rounded-md shadow-sm px-3 py-2 text-xs"
            style={{
              left: `${(x(hover) / W) * 100}%`,
              transform: x(hover) > W / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
            }}
          >
            <div className="font-semibold text-ink mb-1">{shortDay(hoverDay)}</div>
            {series.map((s) => {
              const p = s.points.find((q) => q.day === hoverDay);
              return (
                <div key={s.key} className="flex items-center gap-1.5 text-ink tabular-nums">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.label}: {p ? p.value.toLocaleString("da-DK") : "—"}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <details className="px-4 pb-3 text-xs text-muted">
        <summary className="cursor-pointer">Vis som tabel</summary>
        <table className="mt-2 w-full tabular-nums">
          <thead>
            <tr>
              <th className="text-left font-semibold py-1">Dag</th>
              {series.map((s) => (
                <th key={s.key} className="text-right font-semibold py-1">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d} className="border-t border-border">
                <td className="py-1 text-ink">{d}</td>
                {series.map((s) => (
                  <td key={s.key} className="py-1 text-right text-ink">
                    {s.points.find((p) => p.day === d)?.value.toLocaleString("da-DK") ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
