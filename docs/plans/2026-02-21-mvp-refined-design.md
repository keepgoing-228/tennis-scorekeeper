# Tennis Scorekeeper — Refined MVP Design

## 1) Scope

### In scope (MVP)
- Client-only offline app (no backend, no sync)
- 2 pages: match creation (`/new`) and scoring (`/match/:id`)
- Configurable rules: Best of 1/3/5, tiebreak none/7pt, singles/doubles
- Event-sourced architecture with IndexedDB persistence
- Undo support via event log
- Unit tests for domain logic

### Deferred
- Backend, sync, auth (Supabase)
- Match history list page (`/`)
- Match detail/stats page (`/match/:id/detail`)
- Snapshots (replay structured to accept starting state for future addition)
- Stats derivation
- PWA service worker
- Additional tiebreak variants (super tiebreak, no-ad, etc.)

---

## 2) Tech Stack

- **React 19** + **TypeScript** + **Vite** (already set up)
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Dexie** for IndexedDB persistence
- **Vitest** for testing

---

## 3) Domain Model

### Types

```ts
type BestOf = 1 | 3 | 5;

type Ruleset = {
  bestOf: BestOf;
  tiebreak: "none" | "7pt";
  matchType: "singles" | "doubles";
};

type Player = { playerId: string; displayName: string };
type Team = { teamId: "A" | "B"; players: Player[] };

type PointScore = 0 | 15 | 30 | 40 | "AD";

type GameState =
  | { kind: "normal"; pointsA: PointScore; pointsB: PointScore; deuce: boolean }
  | { kind: "tiebreak"; tbA: number; tbB: number; target: 7 };

type SetState = {
  gamesA: number;
  gamesB: number;
  game: GameState;
};

type MatchState = {
  matchId: string;
  ruleset: Ruleset;
  teams: { A: Team; B: Team };
  sets: SetState[];
  currentSetIndex: number;
  setsWonA: number;
  setsWonB: number;
  server: "A" | "B";
  status: "in_progress" | "finished";
  winner?: "A" | "B";
};
```

### Events

```ts
type BaseEvent = {
  eventId: string;       // uuid
  matchId: string;
  createdAt: string;     // ISO
  seq: number;           // per-match increasing integer
};

type Event =
  | (BaseEvent & { type: "MATCH_CREATED"; payload: { ruleset: Ruleset; teams: { A: Team; B: Team }; initialServer: "A" | "B" } })
  | (BaseEvent & { type: "POINT_WON"; payload: { team: "A" | "B" } })
  | (BaseEvent & { type: "UNDO"; payload: { targetEventId: string } })
  | (BaseEvent & { type: "REDO"; payload: { targetEventId: string } })
  | (BaseEvent & { type: "MATCH_ENDED"; payload: {} });
```

No `deviceId` field for MVP (single device, no sync).

### Domain Functions

- `initMatchState(ruleset, teams, server) → MatchState` — create initial state
- `applyEvent(state, event) → MatchState` — pure function, single event transition
- `replay(events, startingState?) → MatchState` — rebuild from events; accepts optional starting state for future snapshot support
- `getEffectiveEvents(events) → Event[]` — filter out undone events

### State Machine Rules

- **Point scoring**: 0 → 15 → 30 → 40 → game won
- **Deuce/Advantage**: at 40-40, enter deuce; advantage to scorer; if advantage lost, back to deuce
- **Tiebreak entry**: at 6-6 when `ruleset.tiebreak === "7pt"`
- **Tiebreak scoring**: first to 7 with 2-point margin
- **Set win**: 6 games with 2-game margin, or tiebreak win
- **Match win**: win `ceil(bestOf / 2)` sets
- **Server rotation**: alternates each game; in tiebreak, every 2 points

---

## 4) Architecture: Event-Sourced with Live State

### Approach
Keep the event log as the source of truth. Maintain a live `MatchState` in memory during scoring for fast UI updates. Use `replay()` only on page load to reconstruct state.

### Data flow — scoring a point

```
User taps "A scores"
  → Create POINT_WON event with next seq number
  → Write event to IndexedDB (persist first!)
  → applyEvent(currentState, event) → new MatchState
  → Update React state → UI re-renders
```

### Data flow — page load

```
Navigate to /match/:id
  → Load all events for matchId from IndexedDB
  → getEffectiveEvents(events) → filter undone
  → replay(effectiveEvents) → MatchState
  → Set React state → render scoring screen
```

### Data flow — undo

```
User taps "Undo"
  → Find the last active POINT_WON event
  → Create UNDO event targeting it
  → Write to IndexedDB
  → Replay all effective events → new MatchState (full replay, not incremental)
  → Update React state
```

---

## 5) Persistence (IndexedDB / Dexie)

### Tables
- `matches` — matchId, ruleset, teams, status, createdAt, updatedAt
- `events` — eventId, matchId, seq, type, payload, createdAt

### Indexes
- `events`: indexed by `[matchId+seq]`
- `matches`: indexed by `matchId`

### Reliability
- Write event to IndexedDB **before** updating UI state
- Prevents score loss on crashes or page refresh

---

## 6) UI Design

### Match Creation Page (`/new`)

Form fields:
- Team A name (text input, default: "Team A")
- Team B name (text input, default: "Team B")
- Best of: 1 / 3 / 5 (selector)
- Tiebreak: none / 7pt (toggle)
- Match type: singles / doubles (selector)
- First server: A or B (selector)
- "Start Match" button

For doubles, allow entering 2 player names per team.

### Scoring Page (`/match/:id`)

```
┌─────────────────────────────┐
│  Set: 1-0  Games: 4-3       │  ← scoreboard header
│  Serving: A                 │
├──────────────┬──────────────┤
│              │              │
│   TEAM A     │   TEAM B     │  ← giant tap zones
│     30       │     15       │     (left/right half)
│              │              │
├──────────────┴──────────────┤
│         [ Undo ]            │  ← undo button
└─────────────────────────────┘
```

- Score buttons fill ~70% of screen height for easy tapping
- Current point score shown prominently on each button
- Scoreboard header: sets won, games in current set, server indicator
- Undo button at bottom (single tap, undoes last point)
- Match end: show winner, disable score buttons, offer "New Match" link

### Routing
- `/new` → match creation form
- `/match/:id` → scoring screen
- `/` → redirect to `/new`

---

## 7) Testing (Vitest)

Unit tests for domain logic:
- Point scoring: 0→15→30→40→game won
- Deuce/Advantage: 40-40→deuce→adv→game, adv lost→back to deuce
- Tiebreak entry: 6-6 triggers tiebreak when enabled
- Tiebreak scoring: first to 7 with 2-point margin
- Set win: 6 games with 2-game margin, or tiebreak win
- Match win: winning required number of sets
- Server rotation: alternates each game, every 2 points in tiebreak
- Undo: `getEffectiveEvents` correctly filters undone events
- Replay: `replay(events)` produces correct state

---

## 8) Repo Structure

```
src/
  domain/
    types.ts              // Ruleset, MatchState, Event types
    tennis.ts             // initMatchState, applyEvent, replay, getEffectiveEvents
    tennis.test.ts        // Vitest unit tests
  storage/
    db.ts                 // Dexie schema (matches + events tables)
    matchRepo.ts          // CRUD for matches
    eventRepo.ts          // append/query events
  ui/
    pages/
      NewMatch.tsx        // match creation form
      Scoring.tsx         // scoring screen
    components/
      ScoreButton.tsx     // giant tap target
      Scoreboard.tsx      // header with sets/games/server
  App.tsx                 // React Router setup
  main.tsx                // entry point
```

---

## 9) Future Extension Points

- **Snapshots**: `replay(events, startingState?)` already accepts a starting state. Add snapshot table and creation logic when needed.
- **Sync**: Event log with `seq` ordering is sync-ready. Add `deviceId` to events, `synced` flag, and batch upload endpoint.
- **Stats**: Derive from effective events. Add `deriveStats(events, ruleset, teams)` function.
- **More pages**: History list (`/`), match detail (`/match/:id/detail`).
- **Rule variants**: Extend `Ruleset` type with `"super10"`, `"no-ad"`, etc.
