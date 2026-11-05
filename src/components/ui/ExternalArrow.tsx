import { Fragment } from "react";

/**
 * The "opens another site" arrow, drawn as an SVG.
 *
 * Not the character "↗": Windows renders it as a blue emoji tile, which clashed
 * with the palette on every source link (2026-11-05). Inherits the text colour
 * and scales with the font size.
 */
export function ExternalArrow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="square" className={`inline-block align-[-0.05em] ${className}`}
      style={{ width: "0.8em", height: "0.8em" }}>
      <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
    </svg>
  );
}

/**
 * A language-pack string with every "↗" drawn as `ExternalArrow`.
 *
 * The strings keep their "↗" on purpose: `profile-prose.ts` counts the page's
 * fixed text toward the 200-word index floor, and the arrow counts as a word
 * there. Swapping it at render time leaves every profile's count — and so its
 * indexing — exactly as it was.
 */
export function ArrowText({ text }: { text: string }) {
  const parts = text.split("↗");
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && <ExternalArrow />}
        </Fragment>
      ))}
    </>
  );
}
