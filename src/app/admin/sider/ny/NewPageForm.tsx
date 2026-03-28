"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MarkdownToolbar } from "@/components/ui/MarkdownToolbar";

export function NewPageForm({ token }: { token: string }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function handleTitleChange(value: string) {
    setTitle(value);
    // Auto-generer slug fra titel hvis slug ikke er manuelt redigeret
    if (!slugManuallyEdited) {
      const auto = value
        .toLowerCase()
        .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
      setSlug(auto);
    }
  }

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  async function handleCreate() {
    if (!slug.trim() || !title.trim() || !content.trim()) {
      setMessage({ type: "err", text: "Slug, titel og indhold er påkrævet" });
      return;
    }

    // Validér slug-format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setMessage({ type: "err", text: "Slug må kun indeholde a-z, 0-9 og bindestreg" });
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
        setMessage({ type: "ok", text: "Siden er oprettet!" });
        // Redirect til redigering af den nye side
        setTimeout(() => {
          router.push(`/admin/sider/${slug}?token=${token}`);
        }, 800);
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
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="F.eks. Sådan bruger vi AI"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted mb-1">
          URL-slug
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugManuallyEdited(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            placeholder="saadan-bruger-vi-ai"
            className={inputClass}
          />
        </div>
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
          rows={16}
          placeholder="Skriv sidens indhold her..."
          className={`${inputClass} font-mono text-[13px] leading-relaxed resize-y`}
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-green-700" : "text-flag-red"}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleCreate}
        disabled={saving}
        className="w-full py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#00205B" }}
      >
        {saving ? "Opretter…" : "Opret side"}
      </button>
    </div>
  );
}
