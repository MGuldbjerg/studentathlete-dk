"use client";

import { useState, useEffect, useCallback } from "react";
import type { Article } from "@/lib/types";
import { getSportColor } from "@/lib/types";
import { getArticleUrl, getArticleCoverUrl, formatRelativeTime, getReadingTime } from "@/lib/seo";

import { sportLabel, articleTypeLabel } from "@/lib/i18n";

/** Strenge sendes ind: klientkomponenter har ingen request-kontekst at slå sprog op i. */
export interface CarouselStrings {
  previous: string;
  next: string;
  goTo: string;
  readTime: string;
  emptyKicker: string;
  emptyTitle: string;
  emptyBody: string;
}

function fill(tpl: string, n: number): string {
  return tpl.replace("{n}", String(n));
}
function SportTag({ sport, type, lang }: { sport?: string | null; type?: string; lang?: string }) {
  const label = sport ? sportLabel(sport, lang) : type ? articleTypeLabel(type, lang) : null;
  if (!label) return null;
  const color = getSportColor(sport);
  return (
    <span
      style={{ backgroundColor: color }}
      className="inline-block px-2.5 py-0.5 text-xs font-semibold text-white uppercase tracking-wider rounded-sm"
    >
      {label}
    </span>
  );
}

interface CarouselProps {
  articles: Article[];
  strings: CarouselStrings;
  lang: string;
}

export function Carousel({ articles, strings, lang }: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % articles.length);
  }, [articles.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + articles.length) % articles.length);
  }, [articles.length]);

  useEffect(() => {
    if (paused || articles.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [paused, next, articles.length]);

  if (articles.length === 0) {
    return (
      <div
        className="relative w-full flex items-center justify-center"
        style={{
          height: "60vh",
          minHeight: 360,
          background: "linear-gradient(135deg, #00205B 0%, #001240 100%)",
        }}
      >
        <div className="text-center text-white px-8">
          <p className="text-sm uppercase tracking-widest mb-3" style={{ color: "#BF0A30" }}>
            {strings.emptyKicker}
          </p>
          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {strings.emptyTitle}
          </h2>
          <p className="text-white/70 text-lg">
            {strings.emptyBody}
          </p>
        </div>
      </div>
    );
  }

  const slide = articles[current];
  const relTime = formatRelativeTime(slide.published_at);
  const readTime = getReadingTime(slide.content);

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: "60vh", minHeight: 380 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Baggrundsbillede eller gradient */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getArticleCoverUrl(slide)}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        fetchPriority={current === 0 ? "high" : "auto"}
        loading={current === 0 ? "eager" : "lazy"}
      />

      {/* Mørkt overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.15) 100%)",
        }}
      />

      {/* Sport-farvet accent i bunden */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ backgroundColor: getSportColor(slide.sport) }}
      />

      {/* Indhold */}
      <div className="absolute inset-0 flex flex-col justify-end px-6 md:px-16 pb-12">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-3">
            <SportTag sport={slide.sport} type={slide.article_type} lang={lang} />
            {slide.athlete_name && (
              <span className="text-white/80 text-sm font-medium">{slide.athlete_name}</span>
            )}
          </div>

          <a href={getArticleUrl(slide, lang)} data-track="internal">
            <h2
              className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight hover:underline decoration-2 underline-offset-4 cursor-pointer"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {slide.title}
            </h2>
          </a>

          {slide.summary && (
            <p className="text-white/75 text-base md:text-lg line-clamp-2 max-w-2xl mb-3">
              {slide.summary}
            </p>
          )}

          {/* Relativ tid + læsetid */}
          <div className="flex items-center gap-3 text-white/50 text-sm">
            {relTime && <span>{relTime}</span>}
            <span>{fill(strings.readTime, readTime)}</span>
          </div>
        </div>
      </div>

      {/* Pile-knapper */}
      {articles.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            aria-label={strings.previous}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            aria-label={strings.next}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Punkt-indikatorer */}
      {articles.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {articles.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="h-2 rounded-full transition-all"
              style={{
                backgroundColor: i === current
                  ? getSportColor(articles[i].sport)
                  : "rgba(255,255,255,0.4)",
                width: i === current ? "24px" : "8px",
              }}
              aria-label={strings.goTo.replace("{n}", String(i + 1))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
