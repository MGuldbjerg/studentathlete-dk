// Renderer til artikel-indhold. Understøtter markdown-blokke og inline formatering.

import React from "react";
import { AdSlot } from "./AdSlot";

/** Parse inline markdown: **fed**, *kursiv*, [tekst](url) */
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match: **bold**, *italic*, [text](url)
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // **bold**
      nodes.push(<strong key={match.index}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      // *italic*
      nodes.push(<em key={match.index}>{match[2]}</em>);
    } else if (match[3] !== undefined && match[4] !== undefined) {
      // [text](url)
      nodes.push(
        <a
          key={match.index}
          href={match[4]}
          className="underline hover:text-flag-blue transition-colors"
          target={match[4].startsWith("http") ? "_blank" : undefined}
          rel={match[4].startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {match[3]}
        </a>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function ArticleBody({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/).filter((b) => b.trim());

  // Track character count and ad insertions for in-article ads
  let charsSinceLastAd = 0;
  let adsInserted = 0;
  const MAX_IN_ARTICLE_ADS = 2;
  const MIN_CHARS_BEFORE_AD = 600;

  const elements: React.ReactNode[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const trimmed = blocks[i].trim();
    charsSinceLastAd += trimmed.length;

    let element: React.ReactNode;

    // ## Heading 2
    if (trimmed.startsWith("## ")) {
      element = (
        <h2
          key={i}
          style={{ fontFamily: "var(--font-serif)" }}
          className="text-2xl font-bold text-ink mt-10 mb-4"
        >
          {parseInline(trimmed.slice(3))}
        </h2>
      );
    }
    // ### Heading 3
    else if (trimmed.startsWith("### ")) {
      element = (
        <h3
          key={i}
          style={{ fontFamily: "var(--font-serif)" }}
          className="text-xl font-bold text-ink mt-8 mb-3"
        >
          {parseInline(trimmed.slice(4))}
        </h3>
      );
    }
    // > Blockquote
    else if (trimmed.startsWith("> ")) {
      element = (
        <blockquote
          key={i}
          className="my-8 pl-5 border-l-4 text-lg italic text-ink/80"
          style={{ borderColor: "#BF0A30" }}
        >
          {parseInline(trimmed.slice(2))}
        </blockquote>
      );
    }
    // Bullet list
    else {
      const lines = trimmed.split("\n");
      if (lines.every((l) => l.trimStart().startsWith("- "))) {
        element = (
          <ul key={i} className="list-disc pl-6 mb-5 space-y-1">
            {lines.map((line, j) => (
              <li key={j} className="text-base text-ink leading-relaxed">
                {parseInline(line.trimStart().slice(2))}
              </li>
            ))}
          </ul>
        );
      } else {
        // Regular paragraph
        element = (
          <p key={i} className="text-base text-ink leading-relaxed mb-5">
            {parseInline(trimmed)}
          </p>
        );
      }
    }

    elements.push(element);

    // In-article ad: efter hvert 3. blok, min 600 tegn, maks 2
    if (
      (i + 1) % 3 === 0 &&
      charsSinceLastAd >= MIN_CHARS_BEFORE_AD &&
      adsInserted < MAX_IN_ARTICLE_ADS &&
      i < blocks.length - 1 // ikke efter sidste blok
    ) {
      elements.push(
        <AdSlot key={`ad-${adsInserted}`} slot="in-article" className="my-6" />
      );
      adsInserted++;
      charsSinceLastAd = 0;
    }
  }

  return <div className="article-body">{elements}</div>;
}
