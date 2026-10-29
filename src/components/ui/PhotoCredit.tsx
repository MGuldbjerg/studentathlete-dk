import { photoCreditParts, CREDIT_SEPARATOR, type PhotoCreditInput } from "@/lib/photo-credit";

/**
 * The credit line next to a photo: photographer (when known) · "{School} Athletics"
 * · a "Source" link to the page the photo came from. What the photo-permission
 * email promises schools. Wording and link rules: src/lib/photo-credit.ts.
 *
 * Plain props, no athlete object, so article photos can use it too. Renders
 * nothing when there is nothing to say.
 */
export function PhotoCredit({ className, ...input }: PhotoCreditInput & { className?: string }) {
  const { text, link } = photoCreditParts(input);
  if (!text && !link) return null;
  return (
    <p className={className}>
      {text}
      {text && link ? CREDIT_SEPARATOR : null}
      {link && (
        <a href={link.href} target="_blank" rel="nofollow noopener" className="underline hover:opacity-80">
          {link.label}
        </a>
      )}
    </p>
  );
}
