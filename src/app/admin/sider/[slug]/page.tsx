import { notFound } from "next/navigation";
import Link from "next/link";
import { validateAdminToken, getPageBySlug } from "@/lib/admin";
import { EditPageForm } from "./EditPageForm";

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;
  const valid = await validateAdminToken(token ?? null);
  if (!valid) notFound();

  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Rediger: {page.title}</h1>
          <Link
            href={`/admin/sider?token=${token}`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Tilbage
          </Link>
        </div>

        <EditPageForm
          slug={slug}
          initialTitle={page.title}
          initialContent={page.content}
          initialMetaDescription={page.meta_description ?? ""}
          initialPublished={page.published === 1}
          token={token!}
        />
      </div>
    </main>
  );
}
