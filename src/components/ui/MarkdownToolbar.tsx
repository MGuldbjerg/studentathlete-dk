"use client";

import { useRef, useCallback } from "react";

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

type Action = "bold" | "italic" | "h2" | "h3" | "link" | "quote" | "list";

const BUTTONS: Array<{ action: Action; label: string; title: string }> = [
  { action: "h2", label: "H2", title: "Overskrift 2" },
  { action: "h3", label: "H3", title: "Overskrift 3" },
  { action: "bold", label: "F", title: "Fed" },
  { action: "italic", label: "K", title: "Kursiv" },
  { action: "link", label: "🔗", title: "Link" },
  { action: "list", label: "•", title: "Punktliste" },
  { action: "quote", label: "❝", title: "Citat" },
];

export function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
  const apply = useCallback(
    (action: Action) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);
      let before = value.slice(0, start);
      let after = value.slice(end);
      let newCursorStart = start;
      let newCursorEnd = end;

      switch (action) {
        case "bold": {
          const insert = `**${selected || "fed tekst"}**`;
          onChange(before + insert + after);
          newCursorStart = start + 2;
          newCursorEnd = start + 2 + (selected || "fed tekst").length;
          break;
        }
        case "italic": {
          const insert = `*${selected || "kursiv tekst"}*`;
          onChange(before + insert + after);
          newCursorStart = start + 1;
          newCursorEnd = start + 1 + (selected || "kursiv tekst").length;
          break;
        }
        case "link": {
          const text = selected || "linktekst";
          const insert = `[${text}](https://)`;
          onChange(before + insert + after);
          newCursorStart = start + text.length + 3;
          newCursorEnd = start + text.length + 11;
          break;
        }
        case "h2": {
          // Find start of current line
          const lineStart = before.lastIndexOf("\n") + 1;
          const linePrefix = before.slice(lineStart);
          before = before.slice(0, lineStart);
          const insert = `## ${linePrefix}${selected}`;
          onChange(before + insert + after);
          newCursorStart = start + 3;
          newCursorEnd = end + 3;
          break;
        }
        case "h3": {
          const lineStart = before.lastIndexOf("\n") + 1;
          const linePrefix = before.slice(lineStart);
          before = before.slice(0, lineStart);
          const insert = `### ${linePrefix}${selected}`;
          onChange(before + insert + after);
          newCursorStart = start + 4;
          newCursorEnd = end + 4;
          break;
        }
        case "quote": {
          const lineStart = before.lastIndexOf("\n") + 1;
          const linePrefix = before.slice(lineStart);
          before = before.slice(0, lineStart);
          const insert = `> ${linePrefix}${selected}`;
          onChange(before + insert + after);
          newCursorStart = start + 2;
          newCursorEnd = end + 2;
          break;
        }
        case "list": {
          const lineStart = before.lastIndexOf("\n") + 1;
          const linePrefix = before.slice(lineStart);
          before = before.slice(0, lineStart);
          const insert = `- ${linePrefix}${selected}`;
          onChange(before + insert + after);
          newCursorStart = start + 2;
          newCursorEnd = end + 2;
          break;
        }
      }

      // Restore focus and selection after React re-render
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(newCursorStart, newCursorEnd);
      });
    },
    [textareaRef, value, onChange],
  );

  return (
    <div className="flex gap-1 mb-1.5">
      {BUTTONS.map((btn) => (
        <button
          key={btn.action}
          type="button"
          title={btn.title}
          onClick={() => apply(btn.action)}
          className="px-2.5 py-1 text-xs font-semibold rounded border border-border bg-surface text-muted hover:text-ink hover:bg-paper transition-colors"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
