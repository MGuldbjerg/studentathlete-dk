"use client";

import { useState } from "react";
import type { StyleCorrection } from "@/lib/admin";

const CATEGORIES = [
  { value: "oversaettelse", label: "Oversættelse" },
  { value: "idiom", label: "Idiom" },
  { value: "terminologi", label: "Terminologi" },
  { value: "stil", label: "Stil" },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  oversaettelse: "Oversættelse",
  idiom: "Idiom",
  terminologi: "Terminologi",
  stil: "Stil",
};

export function StilguideClient({
  initialCorrections,
  token,
}: {
  initialCorrections: StyleCorrection[];
  token: string;
}) {
  const [corrections, setCorrections] = useState(initialCorrections);
  const [wrongPhrase, setWrongPhrase] = useState("");
  const [correctPhrase, setCorrectPhrase] = useState("");
  const [category, setCategory] = useState("oversaettelse");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [filter, setFilter] = useState<string>("alle");

  async function handleAdd() {
    if (!wrongPhrase.trim() || !correctPhrase.trim()) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/stilguide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          wrong_phrase: wrongPhrase.trim(),
          correct_phrase: correctPhrase.trim(),
          category,
          note: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage({ type: "err", text: (body as { error?: string }).error ?? "Noget gik galt" });
        return;
      }

      const { id } = (await res.json()) as { id: number };
      setCorrections((prev) => [
        {
          id,
          wrong_phrase: wrongPhrase.trim(),
          correct_phrase: correctPhrase.trim(),
          category,
          note: note.trim() || null,
          active: 1,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setWrongPhrase("");
      setCorrectPhrase("");
      setNote("");
      setMessage({ type: "ok", text: "Rettelse tilføjet!" });
    } catch {
      setMessage({ type: "err", text: "Netværksfejl — prøv igen" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/admin/stilguide/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        setCorrections((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      // Ignorer fejl ved sletning
    }
  }

  const filtered =
    filter === "alle" ? corrections : corrections.filter((c) => c.category === filter);

  // Gruppér per kategori
  const grouped = filtered.reduce<Record<string, StyleCorrection[]>>((acc, c) => {
    const key = c.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const inputClass =
    "w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-ink text-sm placeholder:text-muted focus:outline-none focus:border-flag-blue";

  return (
    <div>
      {/* Tilføj-formular */}
      <div className="bg-paper rounded-lg border border-border p-4 mb-6">
        <h2 className="text-sm font-semibold text-ink mb-3">Tilføj rettelse</h2>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Forkert frase
              </label>
              <input
                type="text"
                value={wrongPhrase}
                onChange={(e) => setWrongPhrase(e.target.value)}
                placeholder='fx "mærker trykket"'
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Korrekt frase
              </label>
              <input
                type="text"
                value={correctPhrase}
                onChange={(e) => setCorrectPhrase(e.target.value)}
                placeholder='fx "mærker presset"'
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Note (valgfri)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Kontekst eller forklaring"
                className={inputClass}
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !wrongPhrase.trim() || !correctPhrase.trim()}
            className="py-2.5 rounded-lg font-semibold text-white text-sm transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#00205B" }}
          >
            {saving ? "Tilføjer…" : "Tilføj rettelse"}
          </button>
        </div>
        {message && (
          <p
            className={`text-sm mt-2 ${message.type === "ok" ? "text-green-700" : "text-flag-red"}`}
          >
            {message.text}
          </p>
        )}
      </div>

      {/* Kategori-filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("alle")}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            filter === "alle"
              ? "bg-ink text-white"
              : "bg-paper border border-border text-muted hover:text-ink"
          }`}
        >
          Alle ({corrections.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = corrections.filter((c) => c.category === cat.value).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === cat.value
                  ? "bg-ink text-white"
                  : "bg-paper border border-border text-muted hover:text-ink"
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Liste over rettelser */}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-muted text-center py-8">
          Ingen rettelser endnu. Tilføj den første ovenfor.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                {CATEGORY_LABELS[cat] ?? cat}
              </h3>
              <div className="flex flex-col gap-1.5">
                {items.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between bg-paper rounded-lg border border-border px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-ink">
                        Skriv{" "}
                        <span className="font-semibold text-green-700">
                          &ldquo;{c.correct_phrase}&rdquo;
                        </span>
                        , ikke{" "}
                        <span className="line-through text-flag-red">
                          &ldquo;{c.wrong_phrase}&rdquo;
                        </span>
                      </p>
                      {c.note && <p className="text-xs text-muted mt-0.5">{c.note}</p>}
                    </div>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-muted hover:text-flag-red flex-shrink-0 ml-3"
                      title="Fjern rettelse"
                    >
                      Slet
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
