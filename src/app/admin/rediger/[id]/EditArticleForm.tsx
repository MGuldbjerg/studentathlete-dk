"use client";

import { useState, useRef } from "react";
import { MarkdownToolbar } from "@/components/ui/MarkdownToolbar";
import type { Article, Athlete } from "@/lib/types";
import { ARTICLE_TYPE_LABELS } from "@/lib/types";

export function EditArticleForm({
  article,
  athletes,
  token,
}: {
  article: Article;
  athletes: Athlete[];
  token: string;
}) {
  const [title, setTitle] = useState(article.title);
  const [summary, setSummary] = useState(article.summary ?? "");
  const [content, setContent] = useState(article.content);
  const [articleType, setArticleType] = useState(article.article_type);
  const [author, setAuthor] = useState(article.author ?? "");
  const [athleteId, setAthleteId] = useState<number | null>(article.athlete_id);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Vis original-toggle
  const [showOriginal, setShowOriginal] = useState(false);
  const hasOriginal = !!article.original_content;

  // Hurtig-rettelse
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [corrWrong, setCorrWrong] = useState("");
  const [corrCorrect, setCorrCorrect] = useState("");
  const [corrCategory, setCorrCategory] = useState("oversaettelse");
  const [corrSaving, setCorrSaving] = useState(false);
  const [corrMessage, setCorrMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleAddCorrection() {
    if (!corrWrong.trim() || !corrCorrect.trim()) return;
    setCorrSaving(true);
    setCorrMessage(null);
    try {
      const res = await fetch("/api/admin/stilguide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          wrong_phrase: corrWrong.trim(),
          correct_phrase: corrCorrect.trim(),
          category: corrCategory,
          note: null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setCorrMessage({ type: "err", text: (body as { error?: string }).error ?? "Fejl" });
      } else {
        setCorrMessage({ type: "ok", text: "Tilføjet til stilguiden!" });
        setCorrWrong("");
        setCorrCorrect("");
      }
    } catch {
      setCorrMessage({ type: "err", text: "Netværksfejl" });
    } finally {
      setCorrSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/article/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
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
        setMessage({ type: "ok", text: "Gemt!" });
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
      {/* Titel */}
      <div>
        <label className="block text-xs font-semibold text-muted mb-1">Titel</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Summary */}
      <div>
        <label className="block text-xs font-semibold text-muted mb-1">Underrubrik</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Type + Forfatter */}
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

      {/* Atlet-kobling */}
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

      {/* Indhold */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-muted">
            Indhold (markdown)
          </label>
          {hasOriginal && (
            <button
              type="button"
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-xs text-muted hover:text-ink transition-colors"
            >
              {showOriginal ? "← Vis redigeret" : "Vis original"}
            </button>
          )}
        </div>
        {showOriginal ? (
          <textarea
            value={article.original_content ?? ""}
            readOnly
            rows={24}
            className={`${inputClass} font-mono text-[13px] leading-relaxed resize-y bg-gray-50 cursor-default`}
          />
        ) : (
          <>
            <MarkdownToolbar textareaRef={textareaRef} value={content} onChange={setContent} />
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={24}
              className={`${inputClass} font-mono text-[13px] leading-relaxed resize-y`}
            />
          </>
        )}
      </div>

      {/* Hurtig-rettelse til stilguide */}
      <div className="border border-border rounded-lg">
        <button
          type="button"
          onClick={() => setShowCorrectionForm(!showCorrectionForm)}
          className="w-full text-left px-4 py-2.5 text-sm font-medium text-muted hover:text-ink transition-colors"
        >
          {showCorrectionForm ? "▾" : "▸"} Tilføj rettelse til stilguide
        </button>
        {showCorrectionForm && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={corrWrong}
                onChange={(e) => setCorrWrong(e.target.value)}
                placeholder="Forkert frase"
                className={`${inputClass} text-xs`}
              />
              <input
                type="text"
                value={corrCorrect}
                onChange={(e) => setCorrCorrect(e.target.value)}
                placeholder="Korrekt frase"
                className={`${inputClass} text-xs`}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={corrCategory}
                onChange={(e) => setCorrCategory(e.target.value)}
                className={`${inputClass} text-xs flex-1`}
              >
                <option value="oversaettelse">Oversættelse</option>
                <option value="idiom">Idiom</option>
                <option value="terminologi">Terminologi</option>
                <option value="stil">Stil</option>
              </select>
              <button
                type="button"
                onClick={handleAddCorrection}
                disabled={corrSaving || !corrWrong.trim() || !corrCorrect.trim()}
                className="px-4 py-2 text-xs font-semibold text-white rounded-lg transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#00205B" }}
              >
                {corrSaving ? "…" : "Tilføj"}
              </button>
            </div>
            {corrMessage && (
              <p className={`text-xs ${corrMessage.type === "ok" ? "text-green-700" : "text-flag-red"}`}>
                {corrMessage.text}
              </p>
            )}
          </div>
        )}
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
    </div>
  );
}
