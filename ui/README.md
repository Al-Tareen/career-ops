# career-ops-ui

Local visual layer over your `data/applications.md`. The CLI agent stays the source of truth — this UI reads and writes through it.

## Pages

| Route | Purpose |
|---|---|
| `/` | Dashboard — KPIs, status funnel chart, score histogram, weekly cadence, recent activity |
| `/pipeline` | Application list — filter, sort, search (incl. report body), status edit |
| `/follow-ups` | Overdue follow-ups — sourced from `followup-cadence.mjs`, sorted by urgency |
| `/applications/[num]` | Application detail — full report, status editor, metadata |
| `/cv` | Read-only preview of `cv.md` |
| `/settings` | Read-only view of `config/profile.yml` and `modes/_profile.md` |
| `/api/applications` | JSON list (filter/sort/paginate) |
| `/api/applications/[num]` | PATCH status/notes |
| `/api/applications.csv` | CSV export |
| `/api/follow-ups` | JSON from upstream `followup-cadence.mjs` |
| `/api/events` | SSE stream — emits on filesystem changes |
| `/output/[name]` | Serves PDFs from `output/` |

## Phase 2 highlights

- **Charts on `/`**: Recharts (status funnel, score histogram, weekly applications timeline).
- **`/follow-ups`**: spawns `followup-cadence.mjs` and renders 13-overdue cards with urgency, days overdue, next-due date, contacts.
- **Body search**: `/pipeline?q=...` now matches report markdown body, not just company/role/notes.

## Running

From the repo root:

```bash
npm run ui:install   # one-time
npm run ui:dev       # development server with HMR (port 3000)
npm run ui:build     # production build
npm run ui:start     # serve production build (port 3000)
```

The server reads `CAREER_OPS_ROOT` from the environment (defaults to `process.cwd()/..` — i.e., the repo root when running from `ui/`). The launcher scripts set this for you.

## Architecture

```
Browser
  ↓ HTTP / SSE
Next.js (Node, in-memory)
  ├─ chokidar watches data/, reports/
  ├─ parseApplications() reads data/applications.md on each request
  ├─ In-memory cache; rebuilds on file change (no persistent DB)
  ├─ followups() spawns upstream followup-cadence.mjs (30s cache)
  └─ Writer uses file mutex (.ui-update.lock) for atomic edits
       ↓
  Filesystem (data/, reports/, cv.md)
```

**The CLI agent remains source of truth.** Status edits via the UI write back to `applications.md` using the same format the upstream tools expect — `[NNN](../reports/NNN-company-date.md)` with zero-padded numbers.

## Safety

- Status changes validated against `templates/states.yml` (canonical set)
- File writes use atomic rename (`*.tmp → file`) so the file is never half-written
- Per-file mutex prevents concurrent edits (CLI agent vs UI)
- Writer preserves original number formatting (`001` stays `001`) and report link format
- PDF serving is path-validated (`/output/[name]` rejects paths outside `output/`)
- Followups page wraps upstream CLI; failure surfaces as empty cards, never corrupts data

## Tests

```bash
cd ui
npm test
```

Covers: parser, report summarizer, status round-trip, notes round-trip, canonical-status validation, link-format preservation.
