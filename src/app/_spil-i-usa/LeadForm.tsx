"use client";

import { useState } from "react";
import { SPORTS } from "@/lib/types";

/**
 * "Spil i USA"-formular. POSTer til /api/lead med attribution (source_path +
 * referrer), så et fremtidigt NSSA-samarbejde kan afregnes pr. dokumenteret lead.
 * Honeypot-feltet "website" er skjult for mennesker; bots udfylder det.
 */
export function LeadForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sport, setSport] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          sport,
          message,
          website,
          source_path: window.location.pathname + window.location.search,
          referrer: document.referrer || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && body.ok) {
        setState("sent");
      } else {
        setState("error");
        setError(body.error ?? "Noget gik galt — prøv igen");
      }
    } catch {
      setState("error");
      setError("Netværksfejl — prøv igen");
    }
  }

  const inputClass =
    "w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-ink text-sm placeholder:text-muted focus:outline-none focus:border-flag-blue";

  if (state === "sent") {
    return (
      <div
        className="px-5 py-6 border-l-[3px] bg-surface/50 text-ink leading-relaxed"
        style={{ borderLeftColor: "#002868" }}
      >
        <p className="font-semibold mb-1">Tak — vi har modtaget din besked!</p>
        <p className="text-sm text-muted">
          Vi vender tilbage på e-mail. Læs i mellemtiden vores{" "}
          <a href="/viden" className="underline">guides om college-sport</a>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Navn *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            autoComplete="name"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">E-mail *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted mb-1">Sportsgren</label>
        <select value={sport} onChange={(e) => setSport(e.target.value)} className={inputClass}>
          <option value="">Vælg sportsgren…</option>
          {SPORTS.filter((s) => s.slug).map((s) => (
            <option key={s.slug} value={s.label}>
              {s.label}
            </option>
          ))}
          <option value="Andet">Andet</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted mb-1">
          Fortæl kort om dig selv (alder, niveau, klub — og hvad du drømmer om)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Honeypot — skjult for mennesker, bots udfylder den */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state === "error" && <p className="text-sm text-flag-red">{error}</p>}

      <button
        type="submit"
        disabled={state === "sending"}
        className="py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#00205B" }}
      >
        {state === "sending" ? "Sender…" : "Send besked"}
      </button>

      <p className="text-xs text-muted leading-relaxed">
        Vi bruger kun dine oplysninger til at svare dig. Deler vi din henvendelse med en
        rekrutterings-partner, sker det først efter aftale med dig.
      </p>
    </form>
  );
}
