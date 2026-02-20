// Renderer til artikel-indhold. Understøtter afsnit og enkle overskrifter.
// Til fuld markdown-support: skift til react-markdown.
export function ArticleBody({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/).filter((b) => b.trim());

  return (
    <div className="article-body">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} style={{ fontFamily: "var(--font-serif)" }}
              className="text-2xl font-bold text-ink mt-10 mb-4">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} style={{ fontFamily: "var(--font-serif)" }}
              className="text-xl font-bold text-ink mt-8 mb-3">
              {trimmed.slice(4)}
            </h3>
          );
        }
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote key={i}
              className="my-8 pl-5 border-l-4 text-lg italic text-ink/80"
              style={{ borderColor: "#BF0A30" }}>
              {trimmed.slice(2)}
            </blockquote>
          );
        }
        return (
          <p key={i} className="text-base text-ink leading-relaxed mb-5">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
