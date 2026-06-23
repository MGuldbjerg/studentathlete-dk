"use client";

import { useState } from "react";
import type { SettingDef } from "@/lib/site-content";

export function SettingsForm({
  fields,
  values,
  token,
}: {
  fields: SettingDef[];
  values: Record<string, string>;
  token: string;
}) {
  const [state, setState] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? f.default])),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const groups = [...new Set(fields.map((f) => f.group))];
  const input =
    "w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-ink text-sm focus:outline-none focus:border-flag-blue";

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, values: state }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setMsg({ type: "err", text: (b as { error?: string }).error ?? "Noget gik galt" });
      } else {
        setMsg({ type: "ok", text: "Gemt! Ændringerne er live." });
      }
    } catch {
      setMsg({ type: "err", text: "Netværksfejl — prøv igen" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <section key={g}>
          <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-muted mb-3 pb-2 border-b border-border">
            {g}
          </h2>
          <div className="flex flex-col gap-4">
            {fields
              .filter((f) => f.group === g)
              .map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-muted mb-1">{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      value={state[f.key]}
                      onChange={(e) => setState((s) => ({ ...s, [f.key]: e.target.value }))}
                      rows={3}
                      className={`${input} resize-y`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={state[f.key]}
                      onChange={(e) => setState((s) => ({ ...s, [f.key]: e.target.value }))}
                      className={input}
                    />
                  )}
                  {f.help && <p className="text-xs text-muted mt-1">{f.help}</p>}
                </div>
              ))}
          </div>
        </section>
      ))}

      {msg && (
        <p className={`text-sm ${msg.type === "ok" ? "text-green-700" : "text-flag-red"}`}>{msg.text}</p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#00205B" }}
      >
        {saving ? "Gemmer…" : "Gem ændringer"}
      </button>
    </div>
  );
}
