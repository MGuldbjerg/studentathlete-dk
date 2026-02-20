import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAthleteBySlug, getArticlesByAthleteId } from "@/lib/db";
import { BASE_URL } from "@/lib/seo";
import { AthleteProfilePage } from "@/components/profiles/AthleteProfilePage";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const athlete = await getAthleteBySlug(slug);
  if (!athlete) return { title: "Atlet ikke fundet" };

  const description = athlete.profile_summary
    ?? `${athlete.name} spiller ${athlete.sport} for ${athlete.university}. Følg den danske student athlete på StudentAthlete.dk.`;

  return {
    title: `${athlete.name} – ${athlete.sport} | StudentAthlete.dk`,
    description,
    openGraph: {
      title: `${athlete.name} | StudentAthlete.dk`,
      description,
      images: athlete.photo_url ? [{ url: athlete.photo_url, alt: athlete.name }] : [],
      type: "profile",
      siteName: "StudentAthlete.dk",
      url: `${BASE_URL}/atleter/${slug}`,
    },
    twitter: {
      card: athlete.photo_url ? "summary_large_image" : "summary",
      title: `${athlete.name} | StudentAthlete.dk`,
      description,
      images: athlete.photo_url ? [athlete.photo_url] : undefined,
    },
    alternates: { canonical: `${BASE_URL}/atleter/${slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function AtletPage({ params }: { params: Params }) {
  const { slug } = await params;
  const athlete = await getAthleteBySlug(slug);
  if (!athlete) notFound();

  const articles = await getArticlesByAthleteId(athlete.id, 10);

  return <AthleteProfilePage athlete={athlete} articles={articles} />;
}
