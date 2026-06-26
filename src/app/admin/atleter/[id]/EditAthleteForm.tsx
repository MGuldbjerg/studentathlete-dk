"use client";

import { useState } from "react";
import type { Athlete } from "@/lib/types";

export function EditAthleteForm({
  athlete,
}: {
  athlete: Athlete;
}) {
  const [photoUrl, setPhotoUrl] = useState(athlete.photo_url ?? "");
  const [photoCredit, setPhotoCredit] = useState(athlete.photo_credit ?? "");
  const [preferredName, setPreferredName] = useState(athlete.preferred_name ?? "");
  const [gradYear, setGradYear] = useState(
    athlete.expected_graduation ? String(athlete.expected_graduation) : "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/athlete/${athlete.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_url: photoUrl || null,
          photo_credit: photoCredit || null,
          preferred_name: preferredName || null,
          expected_graduation: gradYear.trim() ? parseInt(gradYear, 10) : null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage({ type: "err", text: (body as { error?: string }).error ?? "Noget gik galt" });
      } else {
        setMessage({ type: "ok", text: "Gemt!" });
      }
    } catch {
      setMessage({ type: "err", text: "Netværksfejl — prøv igen" });
    } finally {
      setSaving(false);
    }
  }

  const hasPreview = photoUrl.trim().length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Foretrukket navn */}
      <div className="bg-paper rounded-lg border border-border p-4">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-3">
          Foretrukket navn
        </p>
        <input
          type="text"
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
          placeholder={athlete.name}
          className="w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-ink text-sm
                     placeholder:text-muted focus:outline-none focus:border-flag-blue"
        />
        <p className="text-[11px] text-muted mt-1">
          Det korte navn der bruges i artikler efter første omtale (fx &quot;Marie Eline&quot; i stedet for &quot;Marie Eline Madsen&quot;). Tomt = fuldt navn bruges.
        </p>
      </div>

      {/* Dimissionsår */}
      <div className="bg-paper rounded-lg border border-border p-4">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-3">
          Dimissionsår
        </p>
        <input
          type="number"
          inputMode="numeric"
          min={2000}
          max={2100}
          value={gradYear}
          onChange={(e) => setGradYear(e.target.value)}
          placeholder="fx 2025"
          className="w-32 px-3 py-2.5 border border-border rounded-lg bg-paper text-ink text-sm
                     placeholder:text-muted focus:outline-none focus:border-flag-blue"
        />
        <p className="text-[11px] text-muted mt-1">
          Året atleten dimitterer. 🎓-hatten vises i ét år efter (draft-/kontraktvinduet);
          derefter flyttes atleten automatisk til &quot;Tidligere atleter&quot;. Tomt = ukendt
          (vises som aktiv uden hat).
        </p>
      </div>

      {/* Nuværende status */}
      <div className="bg-paper rounded-lg border border-border p-4">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-3">
          Foto-status
        </p>
        {athlete.photo_url ? (
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
              Har foto
            </span>
            {athlete.photo_credit && (
              <span className="text-xs text-muted">
                Kredit: {athlete.photo_credit}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">
            Intet foto endnu
          </span>
        )}
      </div>

      {/* Forhåndsvisning */}
      <div className="bg-paper rounded-lg border border-border p-4">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-3">
          Forhåndsvisning
        </p>
        {hasPreview ? (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={athlete.name}
              className="w-full max-w-xs h-auto rounded border border-border"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                setMessage({ type: "err", text: "Billedet kunne ikke indlæses — tjek URL" });
              }}
            />
            {photoCredit && (
              <p className="text-xs text-muted mt-2">Kredit: {photoCredit}</p>
            )}
          </div>
        ) : (
          <div
            className="w-36 h-44 flex items-center justify-center text-4xl font-black text-white/20 rounded"
            style={{ backgroundColor: "#00205B" }}
          >
            {athlete.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Formular */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">
            Foto-URL
          </label>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://eksempel.dk/billede.jpg"
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-ink text-sm
                       placeholder:text-muted focus:outline-none focus:border-flag-blue"
          />
          <p className="text-[11px] text-muted mt-1">
            Indsæt et direkte link til billedet (skal ende på .jpg, .png el.lign. eller være et direkte billed-URL)
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted mb-1">
            Kreditering
          </label>
          <input
            type="text"
            value={photoCredit}
            onChange={(e) => setPhotoCredit(e.target.value)}
            placeholder="F.eks. Foto: NC State Athletics"
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-ink text-sm
                       placeholder:text-muted focus:outline-none focus:border-flag-blue"
          />
          <p className="text-[11px] text-muted mt-1">
            Hvordan ønsker rettighedshaveren at blive krediteret?
          </p>
        </div>
      </div>

      {/* Feedback */}
      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-green-700" : "text-flag-red"}`}>
          {message.text}
        </p>
      )}

      {/* Gem-knap */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#00205B" }}
      >
        {saving ? "Gemmer…" : "Gem ændringer"}
      </button>

      {/* Slet foto */}
      {athlete.photo_url && (
        <button
          onClick={() => {
            setPhotoUrl("");
            setPhotoCredit("");
          }}
          className="py-2 text-sm text-flag-red hover:underline"
        >
          Fjern foto
        </button>
      )}
    </div>
  );
}
