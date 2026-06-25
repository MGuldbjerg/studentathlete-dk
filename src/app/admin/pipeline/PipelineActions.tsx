"use client";

import { useState, useEffect, useRef } from "react";

interface Step {
  id: string;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: "discover", label: "Find nye historier", description: "Tjekker feeds og Google News" },
  { id: "backfill", label: "Hent manglende indhold", description: "Backfiller content_raw for stories" },
  { id: "generate", label: "Generér artikler", description: "Skriver udkast fra nye historier" },
  { id: "scrape", label: "Scrap rosters", description: "Opdaterer atleter fra universiteter" },
  { id: "scrape-js", label: "Scrap JS-rosters", description: "JS-renderede sider via CF" },
  { id: "backfill-class-year", label: "Backfill årgangsbetegnelser", description: "Sætter class_year for atleter der mangler den" },
];

type Phase = "queued" | "running" | "done";

interface RunState {
  step: string;
  startedAt: Date;
  workflowFile: string;
  triggeredAt: string;
  phase: Phase;
  conclusion: string | null;
  htmlUrl: string | null;
}

function ElapsedTimer({ startedAt }: { startedAt: Date }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const iv = setInterval(
      () => setElapsed(Math.round((Date.now() - startedAt.getTime()) / 1000)),
      1000,
    );
    return () => clearInterval(iv);
  }, [startedAt]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span className="font-mono tabular-nums">
      {m > 0 ? `${m}m ` : ""}{s}s
    </span>
  );
}

const PHASE_LABEL: Record<Phase, string> = {
  queued: "Venter i kø...",
  running: "Kører",
  done: "",
};

export function PipelineActions() {
  const [runState, setRunState] = useState<RunState | null>(null);
  const [lastResult, setLastResult] = useState<{
    step: string;
    status: "ok" | "err";
    message: string;
    htmlUrl?: string;
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Opdater browser-fane-titlen så status ses uden at skifte fane
  useEffect(() => {
    const original = document.title;
    if (!runState) return () => { document.title = original; };

    const stepLabel = STEPS.find((s) => s.id === runState.step)?.label ?? "Pipeline";
    if (runState.phase === "queued") {
      document.title = `[ Venter ] ${stepLabel}`;
    } else if (runState.phase === "running") {
      document.title = `[ Korer ] ${stepLabel}`;
    } else if (runState.phase === "done") {
      document.title = runState.conclusion === "success"
        ? `[ Faerdig ] ${stepLabel}`
        : `[ Fejl ] ${stepLabel}`;
    }

    return () => { document.title = original; };
  }, [runState?.phase, runState?.step, runState?.conclusion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll GitHub Actions status mens noget kører
  useEffect(() => {
    if (!runState || runState.phase === "done") return;

    pollRef.current = setInterval(async () => {
      try {
        const params = new URLSearchParams({
          workflow: runState.workflowFile,
          after: runState.triggeredAt,
        });
        const res = await fetch(`/api/admin/pipeline/run-status?${params}`);
        if (!res.ok) return;

        const data = await res.json() as {
          phase: Phase;
          conclusion?: string | null;
          htmlUrl?: string;
        };

        setRunState((prev) =>
          prev
            ? { ...prev, phase: data.phase, conclusion: data.conclusion ?? null, htmlUrl: data.htmlUrl ?? null }
            : null,
        );

        if (data.phase === "done") {
          const ok = data.conclusion === "success";
          const finishedStep = runState.step;
          setTimeout(() => {
            setRunState(null);
            setLastResult({
              step: finishedStep,
              status: ok ? "ok" : "err",
              message: ok ? "Afsluttet" : `Fejlede (${data.conclusion ?? "unknown"})`,
              htmlUrl: data.htmlUrl,
            });
          }, 1000);
        }
      } catch {
        // Ignorer netværksfejl — prøv igen næste interval
      }
    }, 6000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runState?.workflowFile, runState?.triggeredAt, runState?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRun(stepId: string) {
    if (runState) return;
    setLastResult(null);

    const res = await fetch("/api/admin/pipeline/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: stepId }),
    });

    const data = await res.json() as {
      error?: string;
      message?: string;
      workflowFile?: string;
      triggeredAt?: string;
    };

    if (!res.ok || !data.workflowFile || !data.triggeredAt) {
      setLastResult({
        step: stepId,
        status: "err",
        message: data.error ?? "Kunne ikke starte workflow",
      });
      return;
    }

    setRunState({
      step: stepId,
      startedAt: new Date(),
      workflowFile: data.workflowFile,
      triggeredAt: data.triggeredAt,
      phase: "queued",
      conclusion: null,
      htmlUrl: null,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Knapper */}
      {STEPS.map((step) => {
        const isRunning = runState?.step === step.id;
        const isDisabled = runState !== null;
        const result = lastResult?.step === step.id ? lastResult : null;

        return (
          <div key={step.id}>
            <button
              onClick={() => handleRun(step.id)}
              disabled={isDisabled}
              className="w-full text-left px-4 py-3 rounded-lg border font-medium text-sm transition-all disabled:opacity-50"
              style={{
                borderColor: isRunning ? "#00205B" : undefined,
                backgroundColor: isRunning ? "#00205B" : undefined,
                color: isRunning ? "white" : "#00205B",
              }}
            >
              <div className="flex items-center justify-between">
                <span>{isRunning ? `${step.label}...` : step.label}</span>
                {isRunning && (
                  <span className="text-xs opacity-70">
                    <ElapsedTimer startedAt={runState!.startedAt} />
                  </span>
                )}
              </div>
              <span
                className="block text-xs mt-0.5 font-normal"
                style={{ color: isRunning ? "rgba(255,255,255,0.7)" : undefined }}
              >
                {step.description}
              </span>
            </button>

            {result && (
              <p className={`text-xs mt-1 ml-1 ${result.status === "ok" ? "text-green-700" : "text-red-600"}`}>
                {result.message}
                {result.htmlUrl && (
                  <a
                    href={result.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 underline"
                  >
                    Se kørsel
                  </a>
                )}
              </p>
            )}
          </div>
        );
      })}

      {/* Status-panel — vises mens noget kører */}
      {runState && (
        <div className="mt-1 rounded-lg border border-border overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100 overflow-hidden">
            {runState.phase === "done" ? (
              <div className="h-full bg-green-500 w-full transition-all duration-500" />
            ) : (
              <div className="h-full bg-blue-500 animate-pipeline-progress" />
            )}
          </div>

          {/* Statuslinje */}
          <div className="px-4 py-3 bg-paper flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {runState.phase !== "done" && (
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
              <span className="text-sm text-ink">
                {PHASE_LABEL[runState.phase] || ""}
                {runState.phase === "running" && (
                  <span className="text-muted ml-1">
                    — <ElapsedTimer startedAt={runState.startedAt} />
                  </span>
                )}
              </span>
            </div>

            {runState.htmlUrl && (
              <a
                href={runState.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted hover:text-ink underline shrink-0"
              >
                GitHub Actions ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
