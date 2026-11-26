"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Division, LocDiv, LocPhase, LocSport, PhaseKind, SeasonKey } from "@/lib/season-calendar";
import s from "./SeasonCalendar.module.css";

/** Every reader-facing string, already in the site's language (built on the server with t()). */
export interface CalendarStrings {
  division: string;
  season: string;
  allSports: string;
  seasonName: Record<SeasonKey, string>;
  seasonHead: Record<SeasonKey, string>;
  mainSeason: Record<SeasonKey, string>;
  semester: { fall: string; spring: string; summer: string };
  months: string[];
  today: string;
  /** "Right now in {division} ({date}):" with the placeholders left in. */
  now: string;
  nowNothing: string;
  phase: Record<PhaseKind, string>;
  legendEst: string;
  legendAa: string;
  estimate: string;
  pickTitle: string;
  pickHint: string;
  allDivisions: string;
  stepByStep: string;
  howYearWorks: string;
  aaNamed: string;
  aaNone: string;
  aaAround: string;
  aaLastYear: string;
  and: string;
  sources: string;
  showAll: string;
  statusNow: string;
  statusNext: string;
  statusOver: string;
  seeFull: string;
}

interface Props {
  data: LocSport[];
  strings: CalendarStrings;
  divisionLabels: Record<Division, string>;
  /** BCP 47 locale for today's date (from the site's language pack). */
  locale: string;
  /** First year of the academic year the data covers (1 Aug startYear – 31 Jul). */
  startYear: number;
  /** "full": the calendar page. "sport": only `ids`, compact, with a link to `fullHref`. */
  mode: "full" | "sport";
  ids?: string[];
  fullHref: string;
}

const DIVS: Division[] = ["D1", "D2", "D3", "NAIA"];
const SEASONS: SeasonKey[] = ["fall", "winter", "spring"];
const KINDS: PhaseKind[] = ["off", "ind", "reg", "conf", "ncaa"];
const fill = (k: PhaseKind) => `var(--cal-${k})`;
const pct = (x: number) => `${(x / 12) * 100}%`;
const fmt = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
const firstClause = (label: string) => label.split(",")[0];

const noSubscribe = () => () => {};
const serverNull = () => null;
/** Today's local date as a stable primitive (YYYY-MM-DD). */
function localIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Position of a date on the 0–12 axis, or null outside the academic year. */
function yearPos(d: Date, startYear: number): number | null {
  const start = Date.UTC(startYear, 7, 1);
  const end = Date.UTC(startYear + 1, 7, 1);
  const t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  if (t < start || t >= end) return null;
  const idx = (d.getMonth() - 7 + 12) % 12;
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return idx + (d.getDate() - 1) / days;
}
const phaseAt = (div: LocDiv | undefined, t: number | null): LocPhase | undefined =>
  t === null || !div?.ph ? undefined : div.ph.find((p) => t >= p.s && t < p.e);

export function SeasonCalendar({ data, strings: S, divisionLabels, locale, startYear, mode, ids, fullHref }: Props) {
  const [div, setDiv] = useState<Division>("D1");
  const [season, setSeason] = useState<SeasonKey | "all">("all");
  const [focus, setFocus] = useState<string | null>(null);
  // Today is read in the browser only (server snapshot null): the page is cached
  // at the edge, and a server-rendered date would also mismatch on hydration.
  const todayIso = useSyncExternalStore(noSubscribe, localIsoDate, serverNull);
  const today = useMemo(() => {
    if (!todayIso) return null;
    const [y, m, d] = todayIso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return { pos: yearPos(date, startYear), label: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date) };
  }, [todayIso, locale, startYear]);

  useEffect(() => {
    if (mode !== "full") return;
    const read = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      if (data.some((x) => x.id === h)) { setFocus(h); setSeason("all"); }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [mode, data]);

  const rows = useMemo(() => (mode === "sport" ? data.filter((x) => ids?.includes(x.id)) : data), [data, ids, mode]);
  const t = today?.pos ?? null;

  function choose(id: string | null) {
    setFocus(id);
    try { window.history.replaceState(null, "", id ? `#${id}` : window.location.pathname + window.location.search); } catch { /* ignore */ }
    if (id) requestAnimationFrame(() => document.getElementById("cal-detail")?.scrollIntoView({ block: "start" }));
  }

  const header = (
    <>
      <div className={`${s.head} ${s.corner}`} />
      {S.months.map((m, i) => (
        <div key={m} className={s.head}>
          {m}{i === 0 && <small> {startYear}</small>}{i === 5 && <small> {startYear + 1}</small>}
        </div>
      ))}
      <div className={s.corner} style={{ borderTop: "1px solid var(--color-border)" }} />
      <div className={s.semRow}>
        {([[0, 4.6, S.semester.fall], [5, 9.5, S.semester.spring], [9.5, 12, S.semester.summer]] as const).map(([a, b, n]) => (
          <div key={n} className={s.sem} style={{ left: pct(a), width: pct(b - a) }}>{n}</div>
        ))}
      </div>
    </>
  );

  const todayLine = t !== null && (
    <>
      <div className={s.today} style={{ left: `calc(var(--cal-name) + (100% - var(--cal-name)) * ${t / 12})` }} />
      <div className={s.todayTag} style={{ left: `calc(var(--cal-name) + (100% - var(--cal-name)) * ${t / 12})` }}>{S.today}</div>
    </>
  );

  function track(d: LocDiv | undefined, extra = "") {
    if (!d || d.none) return <div className={`${s.track} ${extra}`}><div className={s.none}>{d?.none ?? ""}</div></div>;
    return (
      <div className={`${s.track} ${extra}`} aria-hidden="true">
        {d.ph!.map((p, i) => (
          <div key={i} className={`${s.seg} ${s[p.k]} ${p.est ? s.est : ""}`} style={{ left: pct(p.s), width: pct(p.e - p.s) }}
            title={`${p.label}: ${p.when}${p.est ? ` (${S.estimate})` : ""}`} />
        ))}
        {(d.aa ?? []).map((m, i) => (
          <div key={`aa${i}`} className={`${s.aa} ${m.est ? s.aaEst : ""}`} style={{ left: pct(m.p) }} title={`${S.aaNamed}: ${m.when}`} />
        ))}
      </div>
    );
  }

  function rowLabel(x: LocSport) {
    return <>{x.name}{x.sub && <span className={s.sub}>{x.sub}</span>}</>;
  }

  function status(d: LocDiv | undefined): string {
    if (!d?.ph) return d?.none ?? "";
    const cur = phaseAt(d, t);
    // Labels keep their case: they carry proper names (NCAA, College Cup).
    if (cur) return fmt(S.statusNow, { phase: firstClause(cur.label) });
    if (t === null) return "";
    const nxt = [...d.ph].filter((p) => p.s > t).sort((a, b) => a.s - b.s)[0];
    return nxt ? fmt(S.statusNext, { phase: firstClause(nxt.label), date: nxt.startDay }) : S.statusOver;
  }

  const divChips = (
    <div className={s.group}>
      <span className={s.groupLabel}>{S.division}</span>
      {DIVS.map((k) => (
        <button key={k} type="button" className={s.chip} aria-pressed={div === k} onClick={() => setDiv(k)}>{divisionLabels[k]}</button>
      ))}
    </div>
  );

  const legend = (
    <div className={s.legend}>
      {KINDS.filter((k) => rows.some((x) => Object.values(x.divs).some((d) => d.ph?.some((p) => p.k === k)))).map((k) => (
        <span key={k}><i style={{ background: fill(k) }} />{S.phase[k]}</span>
      ))}
      <span><i className={s.est} style={{ background: fill("reg") }} />{S.legendEst}</span>
      <span><i className={s.aaKey} />{S.legendAa}</span>
    </div>
  );

  // ── Compact view on a sport's own page ──
  if (mode === "sport") {
    return (
      <div className={`${s.root} ${s.compact}`}>
        <div className={s.controls}>{divChips}</div>
        <div className={s.scroller}>
          <div className={s.grid}>
            {header}
            {rows.map((x) => (
              <Fragmentish key={x.id}>
                <a className={s.rowName} href={`${fullHref}#${x.id}`}>{rowLabel(x)}</a>
                {track(x.divs[div])}
              </Fragmentish>
            ))}
            {todayLine}
          </div>
        </div>
        {legend}
        {t !== null && (
          <div className={s.status}>
            {rows.map((x) => {
              const st = status(x.divs[div]);
              return st ? <span key={x.id}><strong>{x.name}{x.sub ? ` (${x.sub})` : ""}:</strong> {st}</span> : null;
            })}
          </div>
        )}
        <p className={s.muted}>
          <a className={s.link} href={rows.length === 1 ? `${fullHref}#${rows[0].id}` : fullHref}>{S.seeFull}</a>
        </p>
      </div>
    );
  }

  // ── Full calendar page ──
  const shown = season === "all" ? SEASONS : [season];
  const live = data.map((x) => [x, phaseAt(x.divs[div], t)] as const).filter(([, p]) => p && p.k !== "off");
  const sel = data.find((x) => x.id === focus) ?? null;
  const selDiv = sel?.divs[div];

  return (
    <div className={s.root}>
      <div className={s.controls}>
        {divChips}
        <div className={s.group}>
          <span className={s.groupLabel}>{S.season}</span>
          <button type="button" className={s.chip} aria-pressed={season === "all"} onClick={() => { setSeason("all"); choose(null); }}>{S.allSports}</button>
          {SEASONS.map((k) => (
            <button key={k} type="button" className={s.chip} aria-pressed={season === k} onClick={() => { setSeason(k); choose(null); }}>{S.seasonName[k]}</button>
          ))}
        </div>
      </div>

      {today && (
        <div className={s.now} aria-live="polite">
          <strong>{fmt(S.now, { division: divisionLabels[div], date: today.label })}</strong>
          {live.length ? live.map(([x, p]) => (
            <span key={x.id} className={s.pill}><i className={s.sw} style={{ background: fill(p!.k) }} />{x.name}{x.sub ? ` (${x.sub})` : ""}: {firstClause(p!.label)}</span>
          )) : <span>{S.nowNothing}</span>}
        </div>
      )}

      <div className={s.scroller}>
        <div className={s.grid}>
          {header}
          {shown.map((k) => (
            <Fragmentish key={k}>
              <div className={s.seasonHead}>{S.seasonHead[k]}<span>{divisionLabels[div]} · {S.mainSeason[k]}</span></div>
              {data.filter((x) => x.season === k).map((x) => {
                const cls = focus && focus !== x.id ? s.dim : "";
                return (
                  <Fragmentish key={x.id}>
                    <button type="button" className={`${s.rowName} ${cls} ${focus === x.id ? s.focused : ""}`} aria-pressed={focus === x.id}
                      onClick={() => choose(focus === x.id ? null : x.id)}>{rowLabel(x)}</button>
                    {track(x.divs[div], cls)}
                  </Fragmentish>
                );
              })}
            </Fragmentish>
          ))}
          {todayLine}
        </div>
      </div>

      {legend}

      <section id="cal-detail" className={s.detail} aria-live="polite">
        {!sel ? (
          <div><h2>{S.pickTitle}</h2><p className={s.muted}>{S.pickHint}</p></div>
        ) : (
          <>
            <div>
              <h2>{sel.name}{sel.sub && <span className={s.sub} style={{ fontSize: "1.1rem", marginLeft: "0.5rem" }}>{sel.sub}</span>}</h2>
              <p className={s.muted}>{divisionLabels[div]}{status(selDiv) ? ` · ${status(selDiv)}` : ""}</p>
            </div>
            <div>
              <p className={s.h3}>{S.allDivisions}</p>
              <div className={s.scroller}>
                <div className={s.grid}>
                  {header}
                  {DIVS.map((k) => (
                    <Fragmentish key={k}>
                      <button type="button" className={`${s.rowName} ${k === div ? s.focused : ""}`} aria-pressed={k === div} onClick={() => setDiv(k)}>{divisionLabels[k]}</button>
                      {track(sel.divs[k])}
                    </Fragmentish>
                  ))}
                  {todayLine}
                </div>
              </div>
            </div>
            <div className={s.cols}>
              <div>
                <p className={s.h3}>{fmt(S.stepByStep, { division: divisionLabels[div] })}</p>
                {selDiv?.ph ? (
                  <ul className={s.phases}>
                    {[...selDiv.ph].sort((a, b) => a.s - b.s).map((p, i) => (
                      <li key={i}>
                        <i className={`${s.sw} ${p.est ? s.est : ""}`} style={{ background: fill(p.k) }} />
                        <span>{p.label}</span>
                        <span className={s.when}>{p.est ? "≈ " : ""}{p.when}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className={s.muted}>{selDiv?.none}</p>}
              </div>
              <div className={s.notes}>
                <p><span className={s.h3} style={{ display: "block" }}>{S.howYearWorks}</span>{sel.note}{selDiv?.note ? ` ${selDiv.note}` : ""}</p>
                <p>
                  <span className={s.h3} style={{ display: "block" }}>{S.aaNamed}</span>
                  {selDiv?.aa?.length
                    ? selDiv.aa.map((m) => (m.est ? fmt(S.aaAround, { date: m.when }) : m.when)).join(` ${S.and} `) + (selDiv.aa.some((m) => m.est) ? ` ${S.aaLastYear}` : "")
                    : S.aaNone}
                </p>
                <div>
                  <p className={s.h3}>{S.sources}</p>
                  <ol className={s.sources}>
                    {sel.sources.map((x) => <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer">{x.label}</a></li>)}
                  </ol>
                </div>
                <p><button type="button" className={`${s.chip}`} onClick={() => choose(null)}>{S.showAll}</button></p>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/** A keyed fragment (grid children must stay direct children of the grid). */
function Fragmentish({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
