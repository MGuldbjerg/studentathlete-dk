"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { sportNav } from "@/lib/i18n";
// Værdien der gemmes er den kanoniske nøgle ("soccer"); teksten i dropdownen
// er sprogpakkens label ("Fodbold"). Før stod de danske ord som VÆRDIER, så en
// manuelt tilføjet atlet fik en anden sport-nøgle end scraperen ville give.
const SPORT_OPTIONS = sportNav();

const DIVISIONS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "NJCAA"];

export function AddAthleteForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      sport: form.get("sport") as string,
      university: form.get("university") as string,
      division: form.get("division") as string,
      position: (form.get("position") as string) || null,
      hometown: (form.get("hometown") as string) || null,
      university_state: (form.get("university_state") as string) || null,
    };

    if (!data.name || !data.sport || !data.university) {
      setError("Navn, sport og universitet er påkrævet");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/athlete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Noget gik galt");
        setLoading(false);
        return;
      }
      router.push(`/admin`);
      router.refresh();
    } catch {
      setError("Netværksfejl — prøv igen");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Navn *" name="name" placeholder="F.eks. Marie Eline Madsen" />
      <div>
        <label className="block text-xs font-semibold text-muted mb-1">Sport *</label>
        <select
          name="sport"
          required
          className="w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-ink text-sm"
        >
          {SPORT_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <Field label="Universitet *" name="university" placeholder="F.eks. North Carolina State University" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Division</label>
          <select
            name="division"
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-ink text-sm"
          >
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <Field label="Stat (f.eks. NC)" name="university_state" placeholder="NC" />
      </div>
      <Field label="Position" name="position" placeholder="F.eks. Guard, Forward" />
      <Field label="Hjemby" name="hometown" placeholder="F.eks. Viborg, Danmark" />

      {error && (
        <p className="text-sm text-flag-red">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#00205B" }}
      >
        {loading ? "Tilføjer…" : "Tilføj atlet"}
      </button>
    </form>
  );
}

function Field({
  label, name, placeholder,
}: {
  label: string; name: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted mb-1">{label}</label>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        required={label.includes("*")}
        className="w-full px-3 py-2.5 border border-border rounded-lg bg-paper text-ink text-sm
                   placeholder:text-muted focus:outline-none focus:border-flag-blue"
      />
    </div>
  );
}
