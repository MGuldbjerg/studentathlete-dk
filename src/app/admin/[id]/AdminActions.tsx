"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminActions({
  articleId,
}: {
  articleId: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"publish" | "reject" | null>(null);

  async function handleAction(action: "publish" | "reject") {
    if (loading) return;
    const label = action === "publish" ? "godkende" : "afvise";
    if (!confirm(`Er du sikker på at du vil ${label} denne artikel?`)) return;

    setLoading(action);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: articleId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert((data as { error?: string }).error ?? "Noget gik galt");
        setLoading(null);
        return;
      }
      router.push(`/admin`);
      router.refresh();
    } catch {
      alert("Netværksfejl — prøv igen");
      setLoading(null);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-paper border-t border-border p-4 flex gap-3 justify-center z-50">
      <button
        onClick={() => handleAction("reject")}
        disabled={loading !== null}
        className="flex-1 max-w-48 py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#BF0A30" }}
      >
        {loading === "reject" ? "Afviser…" : "Afvis"}
      </button>
      <button
        onClick={() => handleAction("publish")}
        disabled={loading !== null}
        className="flex-1 max-w-48 py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#2D5A27" }}
      >
        {loading === "publish" ? "Godkender…" : "Godkend"}
      </button>
    </div>
  );
}
