"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { needleRegex, type CheckKey, type CheckModel, type CheckSentence } from "@/lib/check-view";

const KEY_STYLE: Record<CheckKey["status"], React.CSSProperties> = {
  source: { textDecoration: "underline", textDecorationColor: "#15803d", textDecorationThickness: 2, textUnderlineOffset: 3 },
  db: { backgroundColor: "#dbeafe", color: "#1e3a8a", borderRadius: 3, padding: "0 2px" },
  missing: { backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: 3, padding: "0 2px", fontWeight: 600 },
  loose: { backgroundColor: "#fef3c7", color: "#92400e", borderRadius: 3, padding: "0 2px" },
};

const STATUS_LABEL: Record<CheckKey["status"], string> = {
  source: "i kilden",
  db: "fra vores database, ikke kilden",
  missing: "står ikke i kilden",
  loose: "tallet står ikke ordret i kilden",
};

/** A source line with every occurrence of the needle marked. */
function Marked({ line, active }: { line: string; active: CheckKey | null }) {
  if (!active) return <>{line}</>;
  const re = needleRegex(active.kind, active.needle);
  const g = new RegExp(re.source, re.flags + "g");
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(g)) {
    parts.push(line.slice(last, m.index));
    parts.push(
      <mark key={m.index} style={{ backgroundColor: "#fde047", color: "#111", borderRadius: 2 }}>
        {m[0]}
      </mark>,
    );
    last = m.index! + m[0].length;
  }
  parts.push(line.slice(last));
  return <>{parts}</>;
}

function SentenceText({
  s,
  onKey,
  activeKey,
}: {
  s: CheckSentence;
  onKey: (k: CheckKey) => void;
  activeKey: CheckKey | null;
}) {
  const out: React.ReactNode[] = [];
  let pos = 0;
  s.keys.forEach((k, i) => {
    if (k.start < pos) return; // overlapping match — keep the first
    out.push(s.text.slice(pos, k.start));
    const isActive = activeKey === k;
    out.push(
      <button
        key={i}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onKey(k);
        }}
        title={STATUS_LABEL[k.status]}
        style={{ ...KEY_STYLE[k.status], outline: isActive ? "2px solid #ca8a04" : undefined }}
        className="inline cursor-pointer"
      >
        {s.text.slice(k.start, k.end)}
      </button>,
    );
    pos = k.end;
  });
  out.push(s.text.slice(pos));
  return <>{out}</>;
}

function Findings({ findings }: { findings: CheckSentence["findings"] }) {
  if (!findings.length) return null;
  return (
    <div className="mt-1 mb-2 space-y-1">
      {findings.map((f, i) => (
        <div
          key={i}
          className="text-[13px] leading-snug rounded px-2 py-1 border-l-4"
          style={{
            borderColor: f.severity === "high" ? "#b91c1c" : "#d97706",
            backgroundColor: f.severity === "high" ? "#fef2f2" : "#fffbeb",
            color: "#3f1d0b",
          }}
        >
          {f.why}
        </div>
      ))}
    </div>
  );
}

/** Phone: what the source says about each number and name in one sentence. */
function SentencePanel({ s, sourceLines }: { s: CheckSentence; sourceLines: string[] }) {
  const seen = new Set<string>();
  const keys = s.keys.filter((k) => {
    const id = `${k.kind}:${k.needle.toLowerCase()}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (!keys.length) {
    return <p className="text-xs text-muted mt-1 mb-2">Ingen tal eller navne i sætningen.</p>;
  }
  return (
    <div className="mt-1 mb-3 space-y-2 border-l-2 border-border pl-3">
      {keys.map((k, i) => (
        <div key={i} className="text-[13px]">
          <span style={KEY_STYLE[k.status]}>{s.text.slice(k.start, k.end)}</span>{" "}
          <span className="text-muted">— {STATUS_LABEL[k.status]}</span>
          {k.lines.slice(0, 3).map((li) => (
            <p key={li} className="text-ink/80 mt-0.5 break-words">
              <Marked line={sourceLines[li]} active={k} />
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CheckView({ model }: { model: CheckModel }) {
  const [activeKey, setActiveKey] = useState<CheckKey | null>(null);
  const [hit, setHit] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const pane = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const matchLines = activeKey
    ? model.sourceLines.flatMap((l, i) => (needleRegex(activeKey.kind, activeKey.needle).test(l) ? [i] : []))
    : [];
  const activeLines = new Set(matchLines);
  const target = matchLines.length ? matchLines[hit % matchLines.length] : null;

  // Scroll the source pane itself, not the page: the draft must stay put.
  useEffect(() => {
    if (target === null || !pane.current) return;
    const el = lineRefs.current[target];
    if (el) pane.current.scrollTop = el.offsetTop - pane.current.clientHeight / 3;
  }, [target]);

  function pickKey(k: CheckKey, sentenceId: string) {
    if (activeKey === k) setHit((h) => h + 1);
    else {
      setActiveKey(k);
      setHit(0);
    }
    setOpen(sentenceId);
  }

  function renderSentence(s: CheckSentence, id: string) {
    const isOpen = open === id;
    return (
      <Fragment key={id}>
        <span
          onClick={() => {
            setOpen(isOpen ? null : id);
            const first = s.keys.find((k) => k.lines.length);
            if (first && !isOpen) {
              setActiveKey(first);
              setHit(0);
            }
          }}
          className={`cursor-pointer rounded ${isOpen ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}`}
        >
          <SentenceText s={s} activeKey={activeKey} onKey={(k) => pickKey(k, id)} />
        </span>{" "}
        {(s.findings.length > 0 || isOpen) && (
          <div>
            <Findings findings={s.findings} />
            {isOpen && (
              <div className="lg:hidden">
                <SentencePanel s={s} sourceLines={model.sourceLines} />
              </div>
            )}
          </div>
        )}
      </Fragment>
    );
  }

  const { counts } = model;

  return (
    <>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted mb-3">
        <span><span style={KEY_STYLE.missing}>{counts.missing}</span> står ikke i kilden</span>
        <span><span style={KEY_STYLE.loose}>{counts.loose}</span> tal ikke ordret</span>
        <span><span style={KEY_STYLE.db}>{counts.db}</span> fra databasen</span>
        <span><span style={KEY_STYLE.source}>{counts.source}</span> i kilden</span>
        <span className="hidden lg:inline">· tryk på et ord for at finde det i kilden, tryk igen for næste</span>
        <span className="lg:hidden">· tryk på en sætning for at se kilden</span>
      </div>

      {model.unplaced.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-muted mb-1">Fund uden fast placering</p>
          <Findings findings={model.unplaced} />
        </div>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-4">
        <div className="bg-paper border border-border rounded-lg p-4 lg:h-[calc(100vh-13rem)] lg:overflow-auto text-[15px] leading-relaxed text-ink">
          {/* divs, not h2/p: findings and the phone panel are block content. */}
          <div role="heading" aria-level={2} className="text-lg font-bold mb-3 leading-snug">
            {renderSentence(model.title, "t")}
          </div>
          {model.paragraphs.map((p, pi) => (
            <div key={pi} className="mb-3">
              {p.map((s, si) => renderSentence(s, `${pi}.${si}`))}
            </div>
          ))}
        </div>

        <div
          ref={pane}
          className="hidden lg:block relative bg-paper border border-border rounded-lg p-4 h-[calc(100vh-13rem)] overflow-auto text-[13px] leading-relaxed text-ink/90"
        >
          {model.sourceLines.length === 0 && <p className="text-muted">Ingen kildetekst gemt for denne kladde.</p>}
          {matchLines.length > 1 && (
            <p className="sticky top-0 text-xs text-muted bg-paper pb-1">
              Fund {(hit % matchLines.length) + 1} af {matchLines.length}
            </p>
          )}
          {model.sourceLines.map((l, i) => (
            <p
              key={i}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className={`mb-1 break-words rounded px-1 ${i === target ? "bg-yellow-100 dark:bg-yellow-900/30" : activeLines.has(i) ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}`}
            >
              <Marked line={l} active={activeLines.has(i) ? activeKey : null} />
            </p>
          ))}
        </div>
      </div>

      <details className="lg:hidden mt-3 bg-paper border border-border rounded-lg p-3">
        <summary className="text-sm font-medium text-ink cursor-pointer">
          Hele kilden ({model.sourceLines.length} linjer)
        </summary>
        <div className="mt-2 text-[13px] leading-relaxed text-ink/90">
          {model.sourceLines.map((l, i) => (
            <p key={i} className="mb-1 break-words">{l}</p>
          ))}
        </div>
      </details>
    </>
  );
}
