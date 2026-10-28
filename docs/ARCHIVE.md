# Archive — what was removed and how to get it back

Removed files are still in git. Restore one with `git show <commit>:<path>` (read) or
`git checkout <commit> -- <path>` (bring back). The commit below is the file's last change.

## 2026-10-28 optimisation pass

| File | Last changed | Commit | Why removed |
|---|---|---|---|
| `IDEA-sportsider.md` | 2026-09-16 | `f065dda` | done, superseded or never referenced |
| `IDEA-noejagtighed.md` | 2026-09-01 | `de1b8e7` | done, superseded or never referenced |
| `IDEA-payload.md` | 2026-08-03 | `532702c` | done, superseded or never referenced |
| `PLAN-autonomi-uk.md` | 2026-09-30 | `bc1be4a` | done, superseded or never referenced |
| `PLAN-social-expansion.md` | 2026-08-03 | `2cfbab8` | done, superseded or never referenced |
| `WORKLOG-detection.md` | 2026-06-02 | `2a6b208` | done, superseded or never referenced |
| `SETUP-cloudflare-access.md` | 2026-06-10 | `a10f57a` | done, superseded or never referenced |
| `PROMPT.md` | 2026-05-26 | `8798ce9` | done, superseded or never referenced |
| `prd.md` | 2026-03-11 | `01f3fa8` | done, superseded or never referenced |
| `activity.md` | 2026-03-11 | `01f3fa8` | done, superseded or never referenced |
| `scripts/run-scraper.sh` | 2026-04-05 | `1856e50` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `scripts/scrape-d1.sh` | 2026-03-28 | `34520ae` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `scripts/scrape-all.sh` | 2026-03-30 | `34bcf09` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `scripts/detect-platforms.sh` | 2026-03-28 | `34520ae` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `scripts/import-schools.sh` | 2026-03-28 | `34520ae` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `scripts/pipeline-local.sh` | 2026-04-05 | `345612b` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `scripts/run-full-analysis.sh` | 2026-03-30 | `34bcf09` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `ralph-run.sh` | 2026-03-28 | `34520ae` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `ralph-artikler.bat` | 2026-03-11 | `01f3fa8` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `ralph.toml` | 2026-03-11 | `01f3fa8` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `run_discover.sh` | 2026-03-11 | `01f3fa8` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `run_discover.bat` | 2026-03-11 | `01f3fa8` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `schedule-discover.sh` | 2026-03-11 | `01f3fa8` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `start-dev.bat` | 2026-03-11 | `01f3fa8` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `.github/workflows/rescrape-facebook.yml` | 2026-10-01 | `3f902d7` | unreferenced wrapper / dead loop (Ralph, old discovery task, one-line npx wrappers duplicating package.json) |
| `pipeline/lib/source-trust.ts` | 2026-08-03 | `2cfbab8` | imported by nothing; seed-articles wrote to production D1 |
| `pipeline/seed/seed-articles.ts` | 2026-09-17 | `1a986b8` | imported by nothing; seed-articles wrote to production D1 |
| `pipeline/checks/backfill-story-hashes.ts` | 2026-09-18 | `a199132` | imported by nothing; seed-articles wrote to production D1 |
| `UDKAST-sportsider-da.md` | 2026-09-17 | `9a500c0` | generated output, now gitignored — regenerate with its script |
| `UDKAST-sportsider-en.md` | 2026-09-17 | `9a500c0` | generated output, now gitignored — regenerate with its script |
| `desktop-pakke/StudentAthlete-til-Claude-Desktop.md` | 2026-08-20 | `5c30d37` | generated output, now gitignored — regenerate with its script |
| `projekt-status.md` (history) | 2026-10-28 | `2135676` | 3,841 lines of dated narrative → current state only |

Regenerate: sport-page drafts `npx tsx pipeline/report/export-sport-pages.ts`; desktop pack
`bash scripts/build-desktop-pack.sh`.
