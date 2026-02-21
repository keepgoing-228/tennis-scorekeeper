# Tennis Scorekeeper

A client-side tennis scoring app with event-sourced state management. Track matches, annotate points with loss reasons, and review match history with per-match statistics.

## Features

- **Live scoring** with large tap targets for quick point entry
- **Full tennis rules** including deuce/advantage, tiebreaks, and configurable best-of (1/3/5)
- **Practice tiebreak mode** for standalone first-to-7 tiebreaks
- **Undo/redo** via event sourcing (append-only event log with full replay)
- **Point annotations** — optionally tag each point with a loss reason (double fault, ace, forehand/backhand error, volley error, out, net, winner)
- **Match history** with expandable per-match statistics
- **Offline-first** — all data stored locally in IndexedDB via Dexie

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Dexie (IndexedDB)
- React Router
- Vitest

## Getting Started

```bash
bun install
bun run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Type-check and build for production |
| `bun run test` | Run tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run lint` | Lint with ESLint |

## Architecture

The app uses **event sourcing** — all scoring actions are persisted as immutable events in IndexedDB. Match state is computed by replaying the effective event stream. Undo appends an `UNDO` event rather than mutating history.

```
src/
├── domain/        # Pure scoring logic and types (no I/O)
├── storage/       # IndexedDB persistence (Dexie)
└── ui/
    ├── pages/     # NewMatch, Scoring, MatchHistory
    └── components/# Scoreboard, ScoreButton, AnnotationBar
```
