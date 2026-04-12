# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Start dev server (Vite, port 5173)
bun run build        # Type-check + production build
bun run test         # Run all tests once (vitest)
bun run test:watch   # Run tests in watch mode
bun run lint         # ESLint

# Run a single test file
bunx vitest run src/storage/playerRepo.test.ts

# Run a specific test by name
bunx vitest run -t "allows duplicate display names"
```

## Architecture

Client-side PWA with **event sourcing** — no backend. All data in IndexedDB via Dexie.

### Three layers

- **Domain** (`src/domain/`) — Pure scoring logic, zero I/O. `tennis.ts` has all rules (point progression, deuce/advantage, tiebreaks, set/match wins, server rotation). `types.ts` defines all types.
- **Storage** (`src/storage/`) — Dexie IndexedDB with 3 tables: `matches`, `events`, `players` (v2 schema in `db.ts`). Each table has a repo file exporting async CRUD functions.
- **UI** (`src/ui/`) — React 19 pages and components. Pages at `pages/`, shared components at `components/`.

### Event sourcing pattern

Match state is never stored directly — it's reconstructed by replaying events:

1. Actions append immutable events (`MATCH_CREATED`, `POINT_WON`, `UNDO`, etc.) to the `events` table
2. `getEffectiveEvents()` filters out undone events
3. `replay()` rebuilds `MatchState` from the effective event list
4. Undo works by appending an `UNDO` event referencing the target, not by deleting history

### Routing

HashRouter: `/new` (create match) → `/match/:id` (scoring) → `/history` (results). `/players` for saved player management. Default redirects `/` → `/new`.

### i18n

i18next with 3 locales: `en`, `zh`, `ja` (files in `src/i18n/locales/`). All UI text must use `t()` keys. Auto-detects from browser, stores preference in localStorage.

### Testing

Vitest with `fake-indexeddb` for storage tests. Domain tests (`tennis.test.ts`) are pure logic — no mocking needed. Test setup in `src/test-setup.ts` patches `globalThis.indexedDB`.

### PWA

Configured in `vite.config.ts` via `vite-plugin-pwa`. Deploys to GitHub Pages with base path `/tennis-scorekeeper/`.
