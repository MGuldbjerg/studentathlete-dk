"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const PIPELINE_URL = "http://localhost:3099";

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
];

type Mode = "checking" | "local" | "remote";

interface RunState {
  step: string;
  startedAt: Date;
  elapsedSeconds: number;
}

function ElapsedTimer({ startedAt }: { startedAt: Date }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
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

export function PipelineActions({ token }: { token: string }) {
  const [mode, setMode] = useState<Mode>("checking");
  const [runState, setRunState] = useState<RunState | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{
    step: string;
    status: "ok" | "err";
    message: string;
  } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const checkLocalServer = useCallback(async () => {
    try {
      const res = await fetch(`${PIPELINE_URL}/status`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        setMode("local");
        if (data.running) {
          setRunState({ step: data.running.step, startedAt: new Date(data.running.startedAt), elapsedSeconds: 0 });
        }
      } else {
        setMode("remote");
      }
    } catch {
      setMode("remote");
    }
  }, []);

  useEffect(() => {
    checkLocalServer();
  }, [checkLocalServer]);

  // Auto-scroll log til bunden
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  // Poll lokal server mens noget kører
  useEffect(() => {
    if (!runState || mode !== "local") return;

    const interval = setInterval(async () => {
      try {
        const [pollRes, logsRes] = await Promise.all([
          fetch(`${PIPELINE_URL}/poll`, { signal: AbortSignal.timeout(2000) }),
          fetch(`${PIPELINE_URL}/logs`, { signal: AbortSignal.timeout(2000) }),
        ]);

        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogLines(logsData.lines ?? []);
        }

        if (pollRes.ok) {
          const pollData = await pollRes.json();
          if (!pollData.running) {
            const finishedStep = runState.step;
            setRunState(null);
            setLastResult({ step: finishedStep, status: "ok", message: "Afsluttet" });
          }
        }
      } catch {
        setRunState(null);
        setMode("remote");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [runState, mode]);

  async function runLocal(stepId: string) {
    try {
      const res = await fetch(`${PIPELINE_URL}/run/${stepId}`, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const data = await res.json();
        return { ok: false, message: data.error ?? "Fejl" };
      }
      return { ok: true, message: "Startet lokalt" };
    } catch {
      return { ok: false, message: "Lokal server utilgængelig" };
    }
  }

  async function runRemote(stepId: string) {
    try {
      const res = await fetch("/api/admin/pipeline/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, step: stepId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, message: (data as { error?: string }).error ?? "Fejl" };
      }
      return { ok: true, message: (data as { message?: string }).message ?? "Startet" };
    } catch {
      return { ok: false, message: "Netværksfejl" };
    }
  }

  async function handleRun(stepId: string) {
    if (runState) return;
    setLastResult(null);
    setLogLines([]);

    // Prøv lokal server først, fald tilbage til GitHub Actions
    const result = mode === "local" ? await runLocal(stepId) : await runRemote(stepId);

    if (!result.ok) {
      if (mode === "local") {
        const remoteResult = await runRemote(stepId);
        if (remoteResult.ok) {
          setLastResult({ step: stepId, status: "ok", message: remoteResult.message });
          return;
        }
        setLastResult({ step: stepId, status: "err", message: remoteResult.message });
        return;
      }
      setLastResult({ step: stepId, status: "err", message: result.message });
      return;
    }

    if (mode === "local") {
      setRunState({ step: stepId, startedAt: new Date(), elapsedSeconds: 0 });
    } else {
      // GitHub Actions — kan ikke polle
      setLastResult({ step: stepId, status: "ok", message: result.message });
    }
  }

  if (mode === "checking") {
    return (
      <div className="bg-paper rounded-lg border border-border p-4">
        <p className="text-sm text-muted">Tjekker pipeline...</p>
      </div>
    );
  }

  const runningStep = runState?.step ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Statusindicator */}
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${mode === "local" ? "bg-green-500" : "bg-blue-500"}`} />
        <span className="text-xs text-muted">
          {mode === "local" ? "Lokal server" : "GitHub Actions"}
        </span>
      </div>

      {/* Knapper */}
      {STEPS.map((step) => {
        const isRunning = runningStep === step.id;
        const isDisabled = runningStep !== null;
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
                {isRunning && runState && mode === "local" && (
                  <span className="text-xs opacity-70">
                    <ElapsedTimer startedAt={runState.startedAt} />
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
              </p>
            )}
          </div>
        );
      })}

      {/* Progress + log panel — vises kun når noget kører lokalt */}
      {runState && mode === "local" && (
        <div className="mt-2 rounded-lg border border-border overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-blue-500 animate-pipeline-progress"
              style={{ width: "40%" }}
            />
          </div>

          {/* Log output */}
          <div
            ref={logRef}
            className="bg-gray-950 px-3 py-2 font-mono text-[11px] text-gray-300 overflow-y-auto"
            style={{ maxHeight: "220px", minHeight: "80px" }}
          >
            {logLines.length === 0 ? (
              <span className="text-gray-500 italic">Starter...</span>
            ) : (
              logLines.map((line, i) => (
                <div key={i} className="leading-5 whitespace-pre-wrap break-all">
                  {line}
                </div>
              ))
            )}
            {/* Blinkende cursor */}
            <span className="inline-block w-2 h-3 bg-gray-400 opacity-75 animate-pulse ml-0.5 align-middle" />
          </div>
        </div>
      )}
    </div>
  );
}
