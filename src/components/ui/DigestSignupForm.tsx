"use client";

import { useState } from "react";

/**
 * The sign-up form for the weekly email digest. Rendered by DigestSignup (the
 * server wrapper decides whether the site has the digest at all and which
 * sports to offer); all text arrives in the site's language. The page's own
 * sport is ticked; the rest sit behind «more sports» so the box stays small.
 */
export function DigestSignupForm({ sports, preselect, labels }: {
  sports: { key: string; label: string }[];
  preselect: string | null;
  labels: { heading: string; intro: string; pick: string; email: string; submit: string; sent: string; error: string; privacy: string; more: string };
}) {
  const [chosen, setChosen] = useState<string[]>(preselect ? [preselect] : []);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const top = sports.filter((s) => s.key === preselect);
  const rest = sports.filter((s) => s.key !== preselect);

  function toggle(key: string) {
    setChosen((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const website = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    setState("busy");
    try {
      const res = await fetch("/api/digest/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sports: chosen, website }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  const box = (s: { key: string; label: string }) => (
    <label key={s.key} className="inline-flex items-center gap-2 text-sm text-ink mr-4 mb-2 cursor-pointer">
      <input type="checkbox" checked={chosen.includes(s.key)} onChange={() => toggle(s.key)} className="accent-flag-red" />
      {s.label}
    </label>
  );

  return (
    <section className="border border-border bg-surface px-5 py-5 my-6" aria-labelledby="digest-heading">
      <p id="digest-heading" className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-2">{labels.heading}</p>
      <p className="text-sm text-ink mb-4">{labels.intro}</p>
      {state === "sent" ? (
        <p className="text-sm font-semibold text-ink" role="status">{labels.sent}</p>
      ) : (
        <form onSubmit={submit}>
          <fieldset className="mb-3">
            <legend className="sr-only">{labels.pick}</legend>
            {top.map(box)}
            {rest.length > 0 && (
              <details className="mt-1">
                <summary className="text-xs text-muted cursor-pointer mb-2">{labels.more}</summary>
                {rest.map(box)}
              </details>
            )}
          </fieldset>
          {/* Honeypot: hidden from people, filled in by naive bots. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
            className="absolute -left-[9999px] w-px h-px opacity-0" />
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="digest-email">{labels.email}</label>
            <input id="digest-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={labels.email} autoComplete="email"
              className="flex-1 min-w-[200px] border border-border bg-white px-3 py-2 text-sm text-ink" />
            <button type="submit" disabled={state === "busy" || chosen.length === 0}
              className="px-4 py-2 text-xs font-bold tracking-[0.1em] uppercase text-white disabled:opacity-50"
              style={{ backgroundColor: "#BF0A30" }}>
              {labels.submit}
            </button>
          </div>
          {state === "error" && <p className="text-sm mt-2" style={{ color: "#BF0A30" }} role="alert">{labels.error}</p>}
          <p className="text-[11px] text-muted mt-3">{labels.privacy}</p>
        </form>
      )}
    </section>
  );
}
