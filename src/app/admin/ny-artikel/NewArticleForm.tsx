"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MarkdownToolbar } from "@/components/ui/MarkdownToolbar";
import type { Athlete } from "@/lib/types";
import { ARTICLE_TYPE_LABELS } from "@/lib/types";

export function NewArticleForm({
  athletes,
}: {
  athletes: Athlete[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [articleType, setArticleType] = useState("news");
  const [author, setAuthor] = useState("StudentAthlete.dk");
  const [athleteId, setAthleteId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      setMessage({ type: "err", text: "Titel og indhold er påkrævet" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          content,
          article_type: articleType,
          author: author.trim(),
          athlete_id: athleteId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage({ type: "err", text: (body as { error?: string }).error ?? "Noget gik galt" });
      } else {
        const data = (await res.json()) as { id: number };
        router.push(`/admin/rediger/${data.id}`);
      }
    } catch {
      setMessage({ type: "err", text: "Netværksfejl — prøv igen" });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-ink text-sm placeholder:text-muted focus:outline-none focus:border-flag-blue";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-semibold text-muted mb-1">Titel</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Artikeltitel"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted mb-1">Underrubrik</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Kort beskrivelse af artiklen"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Type</label>
          <select
            value={articleType}
            onChange={(e) => setArticleType(e.target.value)}
            className={inputClass}
          >
            {Object.entries(ARTICLE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Forfatter</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted mb-1">Tilknyttet atlet</label>
        <select
          value={athleteId ?? ""}
          onChange={(e) => setAthleteId(e.target.value ? parseInt(e.target.value, 10) : null)}
          className={inputClass}
        >
          <option value="">Ingen atlet</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {a.sport}, {a.university}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted mb-1">
          Indhold (markdown)
        </label>
        <MarkdownToolbar textareaRef={textareaRef} value={content} onChange={setContent} />
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={24}
          placeholder="Skriv artiklen her..."
          className={`${inputClass} font-mono text-[13px] leading-relaxed resize-y`}
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-green-700" : "text-flag-red"}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#00205B" }}
      >
        {saving ? "Opretter…" : "Opret artikel (som kladde)"}
      </button>
    </div>
  );
}
