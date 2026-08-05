"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/track";

// Klientkomponent: kan ikke selv slå sproget op (ingen request-kontekst), så
// teksten kommer som props fra den server-komponent der rendrer den.
export function SearchBar({
  defaultValue = "",
  placeholder,
  submitLabel,
}: {
  defaultValue?: string;
  /** Oversat af kalderen — ingen dansk default her, den sivede ud på UK-sitet. */
  placeholder: string;
  submitLabel: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("q", value.trim());
      track({ type: "click", path: location.pathname, clickKind: "search", clickTarget: value.trim() });
    } else {
      params.delete("q");
    }
    params.delete("side");
    router.push(`/?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-0">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-4 py-3 text-sm border border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-flag-blue"
        style={{ minWidth: 0 }}
      />
      <button
        type="submit"
        className="px-5 py-3 text-sm font-semibold text-white transition-colors"
        style={{ backgroundColor: "#00205B" }}
        onMouseOver={(e) =>
          ((e.target as HTMLButtonElement).style.backgroundColor = "#001540")
        }
        onMouseOut={(e) =>
          ((e.target as HTMLButtonElement).style.backgroundColor = "#00205B")
        }
      >
        {submitLabel}
      </button>
    </form>
  );
}
