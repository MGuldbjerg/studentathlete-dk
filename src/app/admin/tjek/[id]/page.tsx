import { notFound } from "next/navigation";
import Link from "next/link";
import { getCheckData } from "@/lib/admin";
import { buildCheckModel, type CheckFinding } from "@/lib/check-view";
import { AdminActions } from "../../[id]/AdminActions";
import { CheckView } from "./CheckView";

function parseFindings(json: string | null, label = ""): CheckFinding[] {
  try {
    const arr = JSON.parse(json ?? "[]");
    if (!Array.isArray(arr)) return [];
    return arr.map((f) => ({
      severity: String(f.severity ?? "medium"),
      claim: String(f.claim ?? ""),
      why: label + String(f.why ?? f.message ?? ""),
    }));
  } catch {
    return [];
  }
}

/**
 * Plain-text check of one draft against its full source, built for the phone
 * as much as the desk. The edit page stays the place to change text; this page
 * is for deciding.
 */
export default async function CheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const data = await getCheckData(id);
  if (!data) notFound();

  const model = buildCheckModel({
    title: data.title,
    content: data.content,
    sourceRaw: data.source_raw,
    findings: [...parseFindings(data.review?.findings ?? null), ...parseFindings(data.mechanical, "Mekanisk tjek: ")],
    dbFacts: data.db_facts,
  });

  const nextHref = data.next_id ? `/admin/tjek/${data.next_id}` : "/admin";

  return (
    <main className="min-h-screen bg-surface pb-28">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-sm">
          <Link href="/admin" className="text-muted hover:text-ink">← Kø</Link>
          <span className="text-muted">#{data.id}</span>
          {data.review && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded text-white"
              style={{
                backgroundColor:
                  data.review.verdict === "ok" ? "#2D5A27" : data.review.verdict === "reject" ? "#b91c1c" : "#b45309",
              }}
            >
              Claude: {data.review.verdict.toUpperCase()}
            </span>
          )}
          {data.sensitive && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: "#7f1d1d" }}>
              ■ FØLSOM ({data.sensitive})
            </span>
          )}
          <Link href={`/admin/rediger/${data.id}`} className="font-medium hover:underline" style={{ color: "#00205B" }}>
            Rediger
          </Link>
          {data.source_url && (
            <a href={data.source_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-ink">
              Original kilde ↗
            </a>
          )}
          {data.next_id && (
            <Link href={nextHref} className="text-muted hover:text-ink ml-auto">Spring over →</Link>
          )}
        </div>

        {data.review?.summary && (
          <p className="text-sm text-ink bg-paper border border-border rounded-lg px-3 py-2 mb-3">
            {data.review.summary}
          </p>
        )}

        <CheckView model={model} />
      </div>

      {data.published ? null : <AdminActions articleId={data.id} afterHref={nextHref} />}
    </main>
  );
}
