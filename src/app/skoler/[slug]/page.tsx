import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSchoolBySlug, getAthletesByUniversity, getArticlesByUniversity } from "@/lib/db";
import { BASE_URL } from "@/lib/seo";
import { SchoolProfilePage } from "@/components/profiles/SchoolProfilePage";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) return { title: "Skole ikke fundet" };

  const description = `Oversigt over danske student athletes ved ${school.name}${school.state ? `, ${school.state}` : ""} – ${school.division}${school.conference ? `, ${school.conference}` : ""}.`;

  return {
    title: `${school.name} | StudentAthlete.dk`,
    description,
    openGraph: {
      title: `${school.name} | StudentAthlete.dk`,
      description,
      type: "website",
      siteName: "StudentAthlete.dk",
      url: `${BASE_URL}/skoler/${slug}`,
    },
    alternates: { canonical: `${BASE_URL}/skoler/${slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function SkolePage({ params }: { params: Params }) {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) notFound();

  const [athletes, articles] = await Promise.all([
    getAthletesByUniversity(school.name),
    getArticlesByUniversity(school.name, 6),
  ]);

  return <SchoolProfilePage school={school} athletes={athletes} articles={articles} />;
}
