import { getLatestArticles } from "@/lib/db";
import { BASE_URL, getArticleUrl, formatDate } from "@/lib/seo";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const articles = await getLatestArticles(30);

  const items = articles
    .map((a) => {
      const url = `${BASE_URL}${getArticleUrl(a)}`;
      const pubDate = a.published_at
        ? new Date(a.published_at).toUTCString()
        : new Date(a.created_at).toUTCString();

      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      ${a.summary ? `<description>${escapeXml(a.summary)}</description>` : ""}
      ${a.sport ? `<category>${escapeXml(a.sport)}</category>` : ""}
      ${a.author ? `<dc:creator>${escapeXml(a.author)}</dc:creator>` : ""}
    </item>`;
    })
    .join("\n");

  const lastBuildDate = articles.length > 0 && articles[0].published_at
    ? new Date(articles[0].published_at).toUTCString()
    : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>StudentAthlete.dk</title>
    <link>${BASE_URL}</link>
    <description>Dansk dækning af danske student athletes i USA</description>
    <language>da</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
