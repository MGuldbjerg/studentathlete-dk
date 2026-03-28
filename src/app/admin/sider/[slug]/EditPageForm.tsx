"use client";

import { useState, useRef } from "react";
import { MarkdownToolbar } from "@/components/ui/MarkdownToolbar";

export function EditPageForm({
  slug,
  initialTitle,
  initialContent,
  initialMetaDescription,
  token,
}: {
  slug: string;
  initialTitle: string;
  initialContent: string;
  initialMetaDescription: string;
  token: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [metaDescription, setMetaDescription] = useState(initialMetaDescription);
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
      const res = await fetch(`/api/admin/page/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          title: title.trim(),
          content: content.trim(),
          meta_description: metaDescription.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage({ type: "err", text: (body as { error?: string }).error ?? "Noget gik galt" });
      } else {
        setMessage({ type: "ok", text: "Gemt! Siden er opdateret." });
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
        <label className="block text-xs font-semibold text-muted mb-1">Sidetitel</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted mb-1">
          Meta-beskrivelse (SEO)
        </label>
        <input
          type="text"
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          placeholder="Kort beskrivelse til søgemaskiner"
          className={inputClass}
        />
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
          rows={20}
          className={`${inputClass} font-mono text-[13px] leading-relaxed resize-y`}
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-green-700" : "text-flag-red"}`}>
          {message.text}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#00205B" }}
        >
          {saving ? "Gemmer…" : "Gem side"}
        </button>
        <a
          href={`/${slug}`}
          target="_blank"
          className="px-6 py-3 rounded-lg font-semibold border border-border bg-paper text-ink text-center"
        >
          Se side →
        </a>
      </div>
    </div>
  );
}
