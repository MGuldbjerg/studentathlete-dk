"use client";

import { useState, useEffect, useCallback } from "react";

const PIPELINE_URL = "http://localhost:3099";

interface Step {
  id: string;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: "discover", label: "Find nye historier", description: "Tjekker feeds og Google News" },
  { id: "generate", label: "Generér artikler", description: "Skriver udkast fra nye historier" },
  { id: "scrape", label: "Scrap rosters", description: "Opdaterer atleter fra universiteter" },
  { id: "scrape-js", label: "Scrap JS-rosters", description: "JS-renderede sider via CF" },
];

type Mode = "checking" | "local" | "remote";

export function PipelineActions({ token }: { token: string }) {
  const [mode, setMode] = useState<Mode>("checking");
  const [runningStep, setRunningStep] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    step: string;
    status: "ok" | "err";
    message: string;
  } | null>(null);

  const checkLocalServer = useCallback(async () => {
    try {
      const res = await fetch(`${PIPELINE_URL}/status`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        setMode("local");
        if (data.running) setRunningStep(data.running.step);
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

  // Poll lokal server mens noget kører
  useEffect(() => {
    if (!runningStep || mode !== "local") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${PIPELINE_URL}/poll`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json();
          if (!data.running) {
            setRunningStep(null);
            setLastResult({ step: runningStep, status: "ok", message: "Afsluttet" });
          }
        }
      } catch {
        setRunningStep(null);
        setMode("remote");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [runningStep, mode]);

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
    if (runningStep) return;
    setLastResult(null);
    setRunningStep(stepId);

    // Prøv lokal server først, fald tilbage til GitHub Actions
    const result = mode === "local" ? await runLocal(stepId) : await runRemote(stepId);

    if (!result.ok) {
      // Hvis lokal fejlede, prøv remote
      if (mode === "local") {
        const remoteResult = await runRemote(stepId);
        if (remoteResult.ok) {
          setLastResult({ step: stepId, status: "ok", message: remoteResult.message });
          // Remote-jobs poller vi ikke — de kører i GitHub Actions
          setRunningStep(null);
          return;
        }
        setRunningStep(null);
        setLastResult({ step: stepId, status: "err", message: remoteResult.message });
        return;
      }
      setRunningStep(null);
      setLastResult({ step: stepId, status: "err", message: result.message });
      return;
    }

    if (mode === "remote") {
      // GitHub Actions — vi kan ikke polle, så vis besked og nulstil
      setRunningStep(null);
      setLastResult({ step: stepId, status: "ok", message: result.message });
    }
    // Lokal: polling håndterer resten
  }

  if (mode === "checking") {
    return (
      <div className="bg-paper rounded-lg border border-border p-4">
        <p className="text-sm text-muted">Tjekker pipeline...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`w-2 h-2 rounded-full ${mode === "local" ? "bg-green-500" : "bg-blue-500"}`}
        />
        <span className="text-xs text-muted">
          {mode === "local" ? "Lokal server" : "GitHub Actions"}
        </span>
      </div>

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
              <span className="block">{isRunning ? `${step.label}...` : step.label}</span>
              <span
                className="block text-xs mt-0.5 font-normal"
                style={{ color: isRunning ? "rgba(255,255,255,0.7)" : undefined }}
              >
                {step.description}
              </span>
            </button>
            {result && (
              <p
                className={`text-xs mt-1 ml-1 ${
                  result.status === "ok" ? "text-green-700" : "text-red-600"
                }`}
              >
                {result.message}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
