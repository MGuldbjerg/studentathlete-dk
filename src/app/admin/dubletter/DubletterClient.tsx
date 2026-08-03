"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MergeCandidate } from "@/lib/admin";
import type { Athlete } from "@/lib/types";

function AthleteCard({
  athlete,
  selected,
  onSelect,
}: {
  athlete: Athlete;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-1 text-left rounded-lg border p-3 transition-colors ${
        selected ? "border-flag-blue bg-flag-blue/5" : "border-border bg-paper hover:border-muted"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-bold text-ink">{athlete.name}</span>
        {selected && (
          <span className="text-[10px] font-black tracking-wider uppercase text-flag-blue">
            beholdes
          </span>
        )}
      </div>
      <dl className="text-[11px] text-muted leading-relaxed">
        <div>#{athlete.id} · /atleter/{athlete.slug}</div>
        <div>
          {athlete.university} · {athlete.sport}
          {athlete.position ? ` · ${athlete.position}` : ""}
        </div>
        <div>
          {athlete.hometown ?? "hjemby ukendt"}
          {athlete.class_year ? ` · ${athlete.class_year}` : ""}
        </div>
        {athlete.roster_name && athlete.roster_name !== athlete.name && (
          <div>skolens stavemåde: {athlete.roster_name}</div>
        )}
      </dl>
      {athlete.bio_url && (
        <a
          href={athlete.bio_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] text-flag-blue hover:underline break-all"
        >
          Skolens profil ↗
        </a>
      )}
    </button>
  );
}

export function DubletterClient({ candidates }: { candidates: MergeCandidate[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState<Record<number, string>>({});
  const [keepMerge, setKeepMerge] = useState<Record<number, boolean>>({});

  async function decide(c: MergeCandidate, action: "merge" | "reject") {
    if (action === "merge") {
      const keeper = keepMerge[c.id] ? c.merge : c.keep;
      const loser = keepMerge[c.id] ? c.keep : c.merge;
      const ok = window.confirm(
        `Flet "${loser.name}" (#${loser.id}) ind i "${keeper.name}" (#${keeper.id})?\n\n` +
          `Alt indhold flyttes til #${keeper.id}, og /atleter/${loser.slug} viderestiller dertil. ` +
          `Handlingen kan ikke fortrydes.`,
      );
      if (!ok) return;
    }

    setBusy(c.id);
    try {
      const res = await fetch(`/api/admin/dublet/${c.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, swap: keepMerge[c.id] === true }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setDone((d) => ({ ...d, [c.id]: `Fejl: ${body.error ?? "ukendt"}` }));
      } else {
        setDone((d) => ({ ...d, [c.id]: action === "merge" ? "Flettet" : "Afvist" }));
        router.refresh();
      }
    } catch {
      setDone((d) => ({ ...d, [c.id]: "Netværksfejl — prøv igen" }));
    } finally {
      setBusy(null);
    }
  }

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted bg-paper border border-border rounded-lg p-6 text-center">
        Ingen mulige dubletter i kø. 🎉
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {candidates.map((c) => {
        const swapped = keepMerge[c.id] === true;
        return (
          <div key={c.id} className="bg-paper rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-muted">
                Score {c.score} · {c.reason}
              </span>
              {done[c.id] && (
                <span className="text-xs font-semibold text-green-700">{done[c.id]}</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <AthleteCard
                athlete={c.keep}
                selected={!swapped}
                onSelect={() => setKeepMerge((s) => ({ ...s, [c.id]: false }))}
              />
              <AthleteCard
                athlete={c.merge}
                selected={swapped}
                onSelect={() => setKeepMerge((s) => ({ ...s, [c.id]: true }))}
              />
            </div>

            <p className="text-[11px] text-muted mt-2">
              Klik på den række der skal beholdes. Den anden slettes, men dens
              indhold og tomme felter overføres først.
            </p>

            {!done[c.id] && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => decide(c, "merge")}
                  disabled={busy === c.id}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#00205B" }}
                >
                  {busy === c.id ? "Fletter…" : "Flet"}
                </button>
                <button
                  onClick={() => decide(c, "reject")}
                  disabled={busy === c.id}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-muted border border-border hover:text-ink disabled:opacity-50"
                >
                  Ikke samme person
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
