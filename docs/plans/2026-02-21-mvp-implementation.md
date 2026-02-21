# Tennis Scorekeeper MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a client-only tennis scoring app with event-sourced architecture, IndexedDB persistence, and two pages (match creation + scoring).

**Architecture:** Event-sourced with live in-memory state. Events are the source of truth, stored in IndexedDB via Dexie. On each point, persist the event first, then apply it to in-memory state for fast UI. On page load, replay all effective events to reconstruct state. Undo appends an UNDO event and triggers full replay.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, React Router, Dexie (IndexedDB), Vitest

---

### Task 1: Project Setup — Install Dependencies & Configure Tools

**Files:**
- Modify: `package.json`
- Create: `src/index.css` (replace with Tailwind directives)
- Modify: `vite.config.ts`
- Modify: `tsconfig.app.json`

**Step 1: Install runtime dependencies**

Run: `bun add react-router dexie tailwindcss @tailwindcss/vite`

**Step 2: Install dev dependencies**

Run: `bun add -d vitest`

**Step 3: Configure Tailwind in Vite**

Replace `vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**Step 4: Replace src/index.css with Tailwind directives**

Replace the contents of `src/index.css` with:

```css
@import "tailwindcss";
```

**Step 5: Add test script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 6: Add Vitest types to tsconfig.app.json**

In `tsconfig.app.json`, change the `"types"` field to:

```json
"types": ["vite/client", "vitest/globals"]
```

**Step 7: Verify setup compiles**

Run: `bun run build`
Expected: Build succeeds (may have warnings about unused boilerplate, that's fine)

**Step 8: Commit**

```bash
git add -A && git commit -m "chore: add tailwind, react-router, dexie, vitest"
```

---

### Task 2: Domain Types

**Files:**
- Create: `src/domain/types.ts`

**Step 1: Create the types file**

Create `src/domain/types.ts` with all domain types:

```ts
// --- Ruleset ---

export type BestOf = 1 | 3 | 5;

export type Ruleset = {
  bestOf: BestOf;
  tiebreak: "none" | "7pt";
  matchType: "singles" | "doubles";
};

// --- Players & Teams ---

export type Player = { playerId: string; displayName: string };
export type Team = { teamId: "A" | "B"; players: Player[] };
export type TeamSide = "A" | "B";

// --- Game State ---

export type PointScore = 0 | 15 | 30 | 40 | "AD";

export type NormalGameState = {
  kind: "normal";
  pointsA: PointScore;
  pointsB: PointScore;
  deuce: boolean;
};

export type TiebreakGameState = {
  kind: "tiebreak";
  tbA: number;
  tbB: number;
  target: 7;
};

export type GameState = NormalGameState | TiebreakGameState;

// --- Set State ---

export type SetState = {
  gamesA: number;
  gamesB: number;
  game: GameState;
};

// --- Match State ---

export type MatchStatus = "in_progress" | "finished";

export type MatchState = {
  matchId: string;
  ruleset: Ruleset;
  teams: { A: Team; B: Team };
  sets: SetState[];
  currentSetIndex: number;
  setsWonA: number;
  setsWonB: number;
  server: TeamSide;
  status: MatchStatus;
  winner?: TeamSide;
};

// --- Events ---

export type BaseEvent = {
  eventId: string;
  matchId: string;
  createdAt: string;
  seq: number;
};

export type MatchCreatedEvent = BaseEvent & {
  type: "MATCH_CREATED";
  payload: {
    ruleset: Ruleset;
    teams: { A: Team; B: Team };
    initialServer: TeamSide;
  };
};

export type PointWonEvent = BaseEvent & {
  type: "POINT_WON";
  payload: { team: TeamSide };
};

export type UndoEvent = BaseEvent & {
  type: "UNDO";
  payload: { targetEventId: string };
};

export type RedoEvent = BaseEvent & {
  type: "REDO";
  payload: { targetEventId: string };
};

export type MatchEndedEvent = BaseEvent & {
  type: "MATCH_ENDED";
  payload: Record<string, never>;
};

export type MatchEvent =
  | MatchCreatedEvent
  | PointWonEvent
  | UndoEvent
  | RedoEvent
  | MatchEndedEvent;
```

**Step 2: Verify it compiles**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/domain/types.ts && git commit -m "feat: add domain types for tennis scoring"
```

---

### Task 3: initMatchState + Basic Point Scoring (TDD)

**Files:**
- Create: `src/domain/tennis.test.ts`
- Create: `src/domain/tennis.ts`

**Step 1: Write failing tests for initMatchState and basic point scoring**

Create `src/domain/tennis.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { initMatchState, applyPointWon } from "./tennis.ts";
import type { Ruleset, Team, MatchState, TeamSide } from "./types.ts";

const defaultRuleset: Ruleset = {
  bestOf: 3,
  tiebreak: "7pt",
  matchType: "singles",
};

const teamA: Team = { teamId: "A", players: [{ playerId: "p1", displayName: "Alice" }] };
const teamB: Team = { teamId: "B", players: [{ playerId: "p2", displayName: "Bob" }] };

function scorePoints(state: MatchState, points: TeamSide[]): MatchState {
  return points.reduce((s, team) => applyPointWon(s, team), state);
}

describe("initMatchState", () => {
  it("creates a match with correct initial state", () => {
    const state = initMatchState("match-1", defaultRuleset, { A: teamA, B: teamB }, "A");

    expect(state.matchId).toBe("match-1");
    expect(state.ruleset).toEqual(defaultRuleset);
    expect(state.sets).toHaveLength(1);
    expect(state.currentSetIndex).toBe(0);
    expect(state.setsWonA).toBe(0);
    expect(state.setsWonB).toBe(0);
    expect(state.server).toBe("A");
    expect(state.status).toBe("in_progress");
    expect(state.winner).toBeUndefined();

    const set = state.sets[0];
    expect(set.gamesA).toBe(0);
    expect(set.gamesB).toBe(0);
    expect(set.game).toEqual({ kind: "normal", pointsA: 0, pointsB: 0, deuce: false });
  });
});

describe("basic point scoring", () => {
  it("scores 0 → 15 → 30 → 40", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");

    state = applyPointWon(state, "A");
    expect(state.sets[0].game).toMatchObject({ pointsA: 15, pointsB: 0 });

    state = applyPointWon(state, "A");
    expect(state.sets[0].game).toMatchObject({ pointsA: 30, pointsB: 0 });

    state = applyPointWon(state, "A");
    expect(state.sets[0].game).toMatchObject({ pointsA: 40, pointsB: 0 });
  });

  it("scores points for team B independently", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");

    state = applyPointWon(state, "B");
    expect(state.sets[0].game).toMatchObject({ pointsA: 0, pointsB: 15 });

    state = applyPointWon(state, "A");
    expect(state.sets[0].game).toMatchObject({ pointsA: 15, pointsB: 15 });
  });

  it("wins a game when scoring from 40-0", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    // Score 4 points for A: 15, 30, 40, game
    state = scorePoints(state, ["A", "A", "A", "A"]);

    expect(state.sets[0].gamesA).toBe(1);
    expect(state.sets[0].gamesB).toBe(0);
    expect(state.sets[0].game).toEqual({ kind: "normal", pointsA: 0, pointsB: 0, deuce: false });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: FAIL — module `./tennis.ts` not found

**Step 3: Implement initMatchState and applyPointWon**

Create `src/domain/tennis.ts`:

```ts
import type { GameState, MatchState, NormalGameState, PointScore, Ruleset, Team, TeamSide } from "./types.ts";

const POINT_PROGRESSION: Record<number, PointScore> = { 0: 15, 15: 30, 30: 40 };

function freshGame(): GameState {
  return { kind: "normal", pointsA: 0, pointsB: 0, deuce: false };
}

function freshSet() {
  return { gamesA: 0, gamesB: 0, game: freshGame() };
}

export function initMatchState(
  matchId: string,
  ruleset: Ruleset,
  teams: { A: Team; B: Team },
  server: TeamSide,
): MatchState {
  return {
    matchId,
    ruleset,
    teams,
    sets: [freshSet()],
    currentSetIndex: 0,
    setsWonA: 0,
    setsWonB: 0,
    server,
    status: "in_progress",
  };
}

function otherSide(side: TeamSide): TeamSide {
  return side === "A" ? "B" : "A";
}

function setsNeeded(ruleset: Ruleset): number {
  return Math.ceil(ruleset.bestOf / 2);
}

function winGame(state: MatchState, winner: TeamSide): MatchState {
  const sets = [...state.sets];
  const currentSet = { ...sets[state.currentSetIndex] };

  if (winner === "A") {
    currentSet.gamesA += 1;
  } else {
    currentSet.gamesB += 1;
  }

  // Check for set win
  const { gamesA, gamesB } = currentSet;
  const needsTiebreak = state.ruleset.tiebreak === "7pt" && gamesA === 6 && gamesB === 6;

  if (needsTiebreak) {
    currentSet.game = { kind: "tiebreak", tbA: 0, tbB: 0, target: 7 };
    sets[state.currentSetIndex] = currentSet;
    // In tiebreak, server changes after first point then every 2 — handled in tiebreak scoring
    return { ...state, sets, server: otherSide(state.server) };
  }

  const setWon =
    (gamesA >= 6 || gamesB >= 6) &&
    Math.abs(gamesA - gamesB) >= 2;

  if (setWon) {
    currentSet.game = freshGame(); // won't be used, but keep clean
    sets[state.currentSetIndex] = currentSet;
    return winSet(state, sets, winner);
  }

  // Game won but set continues
  currentSet.game = freshGame();
  sets[state.currentSetIndex] = currentSet;
  return { ...state, sets, server: otherSide(state.server) };
}

function winSet(state: MatchState, sets: typeof state.sets, winner: TeamSide): MatchState {
  const newSetsWonA = state.setsWonA + (winner === "A" ? 1 : 0);
  const newSetsWonB = state.setsWonB + (winner === "B" ? 1 : 0);
  const needed = setsNeeded(state.ruleset);

  if (newSetsWonA >= needed || newSetsWonB >= needed) {
    return {
      ...state,
      sets,
      setsWonA: newSetsWonA,
      setsWonB: newSetsWonB,
      status: "finished",
      winner,
    };
  }

  // Start new set
  sets.push(freshSet());
  return {
    ...state,
    sets,
    setsWonA: newSetsWonA,
    setsWonB: newSetsWonB,
    currentSetIndex: state.currentSetIndex + 1,
    server: otherSide(state.server),
  };
}

function scoreNormalGame(state: MatchState, game: NormalGameState, team: TeamSide): MatchState {
  const scorerKey = team === "A" ? "pointsA" : "pointsB";
  const otherKey = team === "A" ? "pointsB" : "pointsA";
  const scorerPoints = game[scorerKey];
  const otherPoints = game[otherKey];

  // At 40 (or AD)
  if (scorerPoints === 40 || scorerPoints === "AD") {
    if (scorerPoints === "AD") {
      // Win the game
      return winGame(state, team);
    }
    if (otherPoints === 40) {
      // Deuce → Advantage
      const newGame: NormalGameState = { ...game, deuce: true, [scorerKey]: "AD" as PointScore };
      return updateGame(state, newGame);
    }
    // 40 vs < 40 → win the game
    return winGame(state, team);
  }

  // Opponent has AD → back to deuce
  if (otherPoints === "AD") {
    const newGame: NormalGameState = { ...game, pointsA: 40, pointsB: 40, deuce: true };
    return updateGame(state, newGame);
  }

  // Normal progression: 0→15→30→40
  const nextPoint = POINT_PROGRESSION[scorerPoints as number];
  if (nextPoint === undefined) {
    throw new Error(`Invalid point score: ${String(scorerPoints)}`);
  }

  const newGame: NormalGameState = { ...game, [scorerKey]: nextPoint };
  // Check if we just reached deuce (both at 40)
  if (nextPoint === 40 && otherPoints === 40) {
    newGame.deuce = true;
  }
  return updateGame(state, newGame);
}

function scoreTiebreak(state: MatchState, team: TeamSide): MatchState {
  const sets = [...state.sets];
  const currentSet = { ...sets[state.currentSetIndex] };
  const game = currentSet.game;
  if (game.kind !== "tiebreak") throw new Error("Not in tiebreak");

  const newTbA = game.tbA + (team === "A" ? 1 : 0);
  const newTbB = game.tbB + (team === "B" ? 1 : 0);
  const totalPoints = newTbA + newTbB;

  // Check for tiebreak win: reach target with 2-point margin
  if ((newTbA >= game.target || newTbB >= game.target) && Math.abs(newTbA - newTbB) >= 2) {
    const winner: TeamSide = newTbA > newTbB ? "A" : "B";
    if (winner === "A") {
      currentSet.gamesA += 1;
    } else {
      currentSet.gamesB += 1;
    }
    currentSet.game = freshGame();
    sets[state.currentSetIndex] = currentSet;
    return winSet(state, sets, winner);
  }

  // Continue tiebreak — server changes after first point, then every 2 points
  const serverChanges = totalPoints === 1 || (totalPoints > 1 && (totalPoints - 1) % 2 === 0);
  const newServer = serverChanges ? otherSide(state.server) : state.server;

  currentSet.game = { ...game, tbA: newTbA, tbB: newTbB };
  sets[state.currentSetIndex] = currentSet;
  return { ...state, sets, server: newServer };
}

function updateGame(state: MatchState, game: GameState): MatchState {
  const sets = [...state.sets];
  sets[state.currentSetIndex] = { ...sets[state.currentSetIndex], game };
  return { ...state, sets };
}

export function applyPointWon(state: MatchState, team: TeamSide): MatchState {
  if (state.status === "finished") {
    return state;
  }

  const currentSet = state.sets[state.currentSetIndex];
  const game = currentSet.game;

  if (game.kind === "tiebreak") {
    return scoreTiebreak(state, team);
  }

  return scoreNormalGame(state, game, team);
}
```

**Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/domain/ && git commit -m "feat: initMatchState and basic point scoring with tests"
```

---

### Task 4: Deuce/Advantage + Server Rotation Tests (TDD)

**Files:**
- Modify: `src/domain/tennis.test.ts`

**Step 1: Add deuce/advantage and server rotation tests**

Append to `src/domain/tennis.test.ts`:

```ts
describe("deuce and advantage", () => {
  it("enters deuce at 40-40", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    // 40-40
    state = scorePoints(state, ["A", "A", "A", "B", "B", "B"]);
    expect(state.sets[0].game).toMatchObject({ pointsA: 40, pointsB: 40, deuce: true });
  });

  it("advantage to scorer from deuce", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = scorePoints(state, ["A", "A", "A", "B", "B", "B"]); // 40-40
    state = applyPointWon(state, "A"); // AD-40
    expect(state.sets[0].game).toMatchObject({ pointsA: "AD", pointsB: 40, deuce: true });
  });

  it("back to deuce when advantage is lost", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = scorePoints(state, ["A", "A", "A", "B", "B", "B"]); // 40-40
    state = applyPointWon(state, "A"); // AD-40
    state = applyPointWon(state, "B"); // back to 40-40
    expect(state.sets[0].game).toMatchObject({ pointsA: 40, pointsB: 40, deuce: true });
  });

  it("wins game from advantage", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = scorePoints(state, ["A", "A", "A", "B", "B", "B"]); // 40-40
    state = applyPointWon(state, "B"); // 40-AD
    state = applyPointWon(state, "B"); // B wins game
    expect(state.sets[0].gamesB).toBe(1);
    expect(state.sets[0].game).toEqual({ kind: "normal", pointsA: 0, pointsB: 0, deuce: false });
  });
});

describe("server rotation", () => {
  it("alternates server after each game", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    expect(state.server).toBe("A");

    // A wins a game (4 points)
    state = scorePoints(state, ["A", "A", "A", "A"]);
    expect(state.server).toBe("B");

    // B wins a game
    state = scorePoints(state, ["B", "B", "B", "B"]);
    expect(state.server).toBe("A");
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: All tests PASS (the implementation in Task 3 already handles deuce/advantage and server rotation)

**Step 3: Commit**

```bash
git add src/domain/tennis.test.ts && git commit -m "test: add deuce/advantage and server rotation tests"
```

---

### Task 5: Set Win + Tiebreak Tests (TDD)

**Files:**
- Modify: `src/domain/tennis.test.ts`

**Step 1: Add set win and tiebreak tests**

Append to `src/domain/tennis.test.ts`:

```ts
// Helper: win N games for a team (each game = 4 points at love)
function winGames(state: MatchState, team: TeamSide, count: number): MatchState {
  for (let i = 0; i < count; i++) {
    state = scorePoints(state, [team, team, team, team]);
  }
  return state;
}

describe("set win", () => {
  it("wins a set at 6-0", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = winGames(state, "A", 6);

    expect(state.setsWonA).toBe(1);
    expect(state.currentSetIndex).toBe(1);
    expect(state.sets).toHaveLength(2);
  });

  it("does not win set at 6-5 (needs 2-game margin)", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    // A wins 5, B wins 5, A wins 1 more = 6-5
    state = winGames(state, "A", 5);
    state = winGames(state, "B", 5);
    state = winGames(state, "A", 1);

    expect(state.setsWonA).toBe(0); // no set won yet
    expect(state.sets[0].gamesA).toBe(6);
    expect(state.sets[0].gamesB).toBe(5);
  });

  it("enters tiebreak at 6-6 when tiebreak enabled", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = winGames(state, "A", 5);
    state = winGames(state, "B", 5);
    state = winGames(state, "A", 1); // 6-5
    state = winGames(state, "B", 1); // 6-6 → tiebreak

    expect(state.sets[0].game.kind).toBe("tiebreak");
    if (state.sets[0].game.kind === "tiebreak") {
      expect(state.sets[0].game.tbA).toBe(0);
      expect(state.sets[0].game.tbB).toBe(0);
    }
  });

  it("continues to 7-5 when no tiebreak (advantage set)", () => {
    const noTbRuleset: Ruleset = { bestOf: 3, tiebreak: "none", matchType: "singles" };
    let state = initMatchState("m1", noTbRuleset, { A: teamA, B: teamB }, "A");
    state = winGames(state, "A", 5);
    state = winGames(state, "B", 5);
    state = winGames(state, "A", 2); // 7-5

    expect(state.setsWonA).toBe(1);
  });
});

describe("tiebreak", () => {
  function reachTiebreak(): MatchState {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = winGames(state, "A", 5);
    state = winGames(state, "B", 5);
    state = winGames(state, "A", 1);
    state = winGames(state, "B", 1); // 6-6
    return state;
  }

  it("scores tiebreak points", () => {
    let state = reachTiebreak();
    state = applyPointWon(state, "A");

    expect(state.sets[0].game.kind).toBe("tiebreak");
    if (state.sets[0].game.kind === "tiebreak") {
      expect(state.sets[0].game.tbA).toBe(1);
      expect(state.sets[0].game.tbB).toBe(0);
    }
  });

  it("wins tiebreak at 7-0", () => {
    let state = reachTiebreak();
    for (let i = 0; i < 7; i++) {
      state = applyPointWon(state, "A");
    }

    expect(state.setsWonA).toBe(1);
    expect(state.sets[0].gamesA).toBe(7);
    expect(state.sets[0].gamesB).toBe(6);
  });

  it("requires 2-point margin in tiebreak", () => {
    let state = reachTiebreak();
    // Get to 6-6 in tiebreak
    for (let i = 0; i < 6; i++) {
      state = applyPointWon(state, "A");
      state = applyPointWon(state, "B");
    }

    // 6-6 → not won yet
    expect(state.sets[0].game.kind).toBe("tiebreak");

    // A scores → 7-6, still not won
    state = applyPointWon(state, "A");
    expect(state.sets[0].game.kind).toBe("tiebreak");

    // A scores → 8-6, A wins
    state = applyPointWon(state, "A");
    expect(state.setsWonA).toBe(1);
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/domain/tennis.test.ts && git commit -m "test: add set win and tiebreak tests"
```

---

### Task 6: Match Win Tests (TDD)

**Files:**
- Modify: `src/domain/tennis.test.ts`

**Step 1: Add match win tests**

Append to `src/domain/tennis.test.ts`:

```ts
// Helper: win a set for a team (6 games at love)
function winSet_helper(state: MatchState, team: TeamSide): MatchState {
  return winGames(state, team, 6);
}

describe("match win", () => {
  it("wins best-of-3 match after 2 sets", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = winSet_helper(state, "A"); // set 1
    state = winSet_helper(state, "A"); // set 2

    expect(state.status).toBe("finished");
    expect(state.winner).toBe("A");
    expect(state.setsWonA).toBe(2);
  });

  it("wins best-of-1 match after 1 set", () => {
    const bo1: Ruleset = { bestOf: 1, tiebreak: "7pt", matchType: "singles" };
    let state = initMatchState("m1", bo1, { A: teamA, B: teamB }, "A");
    state = winSet_helper(state, "B");

    expect(state.status).toBe("finished");
    expect(state.winner).toBe("B");
  });

  it("wins best-of-5 match after 3 sets", () => {
    const bo5: Ruleset = { bestOf: 5, tiebreak: "7pt", matchType: "singles" };
    let state = initMatchState("m1", bo5, { A: teamA, B: teamB }, "A");
    state = winSet_helper(state, "A");
    state = winSet_helper(state, "B");
    state = winSet_helper(state, "A");
    state = winSet_helper(state, "A");

    expect(state.status).toBe("finished");
    expect(state.winner).toBe("A");
    expect(state.setsWonA).toBe(3);
    expect(state.setsWonB).toBe(1);
  });

  it("ignores points after match is finished", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = winSet_helper(state, "A");
    state = winSet_helper(state, "A");

    const finishedState = state;
    state = applyPointWon(state, "B");
    expect(state).toEqual(finishedState);
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/domain/tennis.test.ts && git commit -m "test: add match win tests"
```

---

### Task 7: getEffectiveEvents + replay (TDD)

**Files:**
- Modify: `src/domain/tennis.test.ts`
- Modify: `src/domain/tennis.ts`

**Step 1: Write failing tests for getEffectiveEvents and replay**

Append to `src/domain/tennis.test.ts`:

```ts
import { initMatchState, applyPointWon, getEffectiveEvents, replay } from "./tennis.ts";
import type { Ruleset, Team, MatchState, TeamSide, PointWonEvent, MatchCreatedEvent, UndoEvent, MatchEvent } from "./types.ts";
```

Note: update the existing import at the top to include `getEffectiveEvents` and `replay`, and import the event types.

Then append test blocks:

```ts
function makeMatchCreatedEvent(matchId: string, ruleset: Ruleset, teams: { A: Team; B: Team }, server: TeamSide): MatchCreatedEvent {
  return {
    eventId: "evt-0",
    matchId,
    createdAt: new Date().toISOString(),
    seq: 0,
    type: "MATCH_CREATED",
    payload: { ruleset, teams, initialServer: server },
  };
}

function makePointWonEvent(matchId: string, seq: number, team: TeamSide): PointWonEvent {
  return {
    eventId: `evt-${seq}`,
    matchId,
    createdAt: new Date().toISOString(),
    seq,
    type: "POINT_WON",
    payload: { team },
  };
}

function makeUndoEvent(matchId: string, seq: number, targetEventId: string): UndoEvent {
  return {
    eventId: `evt-${seq}`,
    matchId,
    createdAt: new Date().toISOString(),
    seq,
    type: "UNDO",
    payload: { targetEventId },
  };
}

describe("getEffectiveEvents", () => {
  it("returns all events when no undo", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A"),
      makePointWonEvent("m1", 2, "B"),
    ];

    const effective = getEffectiveEvents(events);
    expect(effective).toHaveLength(3);
  });

  it("filters out undone events", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A"),
      makePointWonEvent("m1", 2, "B"),
      makeUndoEvent("m1", 3, "evt-2"), // undo the B point
    ];

    const effective = getEffectiveEvents(events);
    expect(effective).toHaveLength(2); // MATCH_CREATED + point A
    expect(effective.every(e => e.type !== "UNDO")).toBe(true);
    expect(effective.find(e => e.eventId === "evt-2")).toBeUndefined();
  });
});

describe("replay", () => {
  it("replays events to produce correct state", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A"),
      makePointWonEvent("m1", 2, "A"),
    ];

    const state = replay(events);
    expect(state.sets[0].game).toMatchObject({ pointsA: 30, pointsB: 0 });
  });

  it("replays with undo correctly", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A"),
      makePointWonEvent("m1", 2, "A"),
      makeUndoEvent("m1", 3, "evt-2"), // undo second A point
    ];

    const state = replay(events);
    expect(state.sets[0].game).toMatchObject({ pointsA: 15, pointsB: 0 });
  });

  it("accepts optional starting state for future snapshot support", () => {
    const startingState = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    const events: MatchEvent[] = [
      makePointWonEvent("m1", 1, "B"),
    ];

    const state = replay(events, startingState);
    expect(state.sets[0].game).toMatchObject({ pointsA: 0, pointsB: 15 });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: FAIL — `getEffectiveEvents` and `replay` not exported

**Step 3: Implement getEffectiveEvents and replay**

Add to the bottom of `src/domain/tennis.ts`:

```ts
import type { ..., MatchEvent, MatchCreatedEvent, PointWonEvent, UndoEvent, RedoEvent } from "./types.ts";
```

Update the import, then add:

```ts
export function getEffectiveEvents(events: MatchEvent[]): MatchEvent[] {
  const undoneIds = new Set<string>();
  const redoneIds = new Set<string>();

  // Process undo/redo in order
  for (const event of events) {
    if (event.type === "UNDO") {
      undoneIds.add(event.payload.targetEventId);
    } else if (event.type === "REDO") {
      undoneIds.delete(event.payload.targetEventId);
    }
  }

  // Return events that are not undone and not undo/redo events themselves
  return events.filter(
    (e) => e.type !== "UNDO" && e.type !== "REDO" && !undoneIds.has(e.eventId)
  );
}

export function replay(events: MatchEvent[], startingState?: MatchState): MatchState {
  const effective = startingState ? events : getEffectiveEvents(events);

  let state = startingState;

  for (const event of effective) {
    if (event.type === "MATCH_CREATED") {
      state = initMatchState(
        event.matchId,
        event.payload.ruleset,
        event.payload.teams,
        event.payload.initialServer,
      );
    } else if (event.type === "POINT_WON" && state) {
      state = applyPointWon(state, event.payload.team);
    }
    // MATCH_ENDED is informational, no state change
  }

  if (!state) {
    throw new Error("No MATCH_CREATED event found and no starting state provided");
  }

  return state;
}
```

**Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/domain/ && git commit -m "feat: add getEffectiveEvents and replay with tests"
```

---

### Task 8: Storage Layer (Dexie)

**Files:**
- Create: `src/storage/db.ts`
- Create: `src/storage/matchRepo.ts`
- Create: `src/storage/eventRepo.ts`

**Step 1: Create the Dexie database schema**

Create `src/storage/db.ts`:

```ts
import Dexie, { type EntityTable } from "dexie";
import type { Ruleset, Team, MatchStatus, MatchEvent } from "../domain/types.ts";

export type MatchRecord = {
  matchId: string;
  ruleset: Ruleset;
  teams: { A: Team; B: Team };
  initialServer: "A" | "B";
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
};

export type EventRecord = MatchEvent;

const db = new Dexie("TennisScorekeeper") as Dexie & {
  matches: EntityTable<MatchRecord, "matchId">;
  events: EntityTable<EventRecord, "eventId">;
};

db.version(1).stores({
  matches: "matchId, status, createdAt",
  events: "eventId, [matchId+seq], matchId",
});

export { db };
```

**Step 2: Create match repository**

Create `src/storage/matchRepo.ts`:

```ts
import { db, type MatchRecord } from "./db.ts";

export async function createMatch(match: MatchRecord): Promise<void> {
  await db.matches.add(match);
}

export async function getMatch(matchId: string): Promise<MatchRecord | undefined> {
  return db.matches.get(matchId);
}

export async function updateMatchStatus(matchId: string, status: MatchRecord["status"]): Promise<void> {
  await db.matches.update(matchId, { status, updatedAt: new Date().toISOString() });
}
```

**Step 3: Create event repository**

Create `src/storage/eventRepo.ts`:

```ts
import { db, type EventRecord } from "./db.ts";

export async function appendEvent(event: EventRecord): Promise<void> {
  await db.events.add(event);
}

export async function getMatchEvents(matchId: string): Promise<EventRecord[]> {
  return db.events.where("matchId").equals(matchId).sortBy("seq");
}

export async function getNextSeq(matchId: string): Promise<number> {
  const events = await db.events.where("matchId").equals(matchId).sortBy("seq");
  if (events.length === 0) return 0;
  return events[events.length - 1].seq + 1;
}
```

**Step 4: Verify it compiles**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/storage/ && git commit -m "feat: add Dexie storage layer with match and event repos"
```

---

### Task 9: App Routing + Clean Up Boilerplate

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Delete: `src/App.css` (Tailwind replaces it)
- Create: `src/ui/pages/NewMatch.tsx` (placeholder)
- Create: `src/ui/pages/Scoring.tsx` (placeholder)

**Step 1: Create placeholder pages**

Create `src/ui/pages/NewMatch.tsx`:

```tsx
export default function NewMatch() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">New Match</h1>
    </div>
  );
}
```

Create `src/ui/pages/Scoring.tsx`:

```tsx
import { useParams } from "react-router";

export default function Scoring() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Scoring: {id}</h1>
    </div>
  );
}
```

**Step 2: Replace App.tsx with router setup**

Replace `src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import NewMatch from "./ui/pages/NewMatch.tsx";
import Scoring from "./ui/pages/Scoring.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/new" replace />} />
        <Route path="/new" element={<NewMatch />} />
        <Route path="/match/:id" element={<Scoring />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Step 3: Clean up main.tsx — remove App.css import**

Update `src/main.tsx` to remove the `App.css` import if present. Keep `index.css` import.

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Step 4: Delete App.css**

Remove `src/App.css`.

**Step 5: Verify dev server runs**

Run: `bun run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add React Router with placeholder pages, remove boilerplate"
```

---

### Task 10: Match Creation Page (NewMatch)

**Files:**
- Modify: `src/ui/pages/NewMatch.tsx`

**Step 1: Implement the match creation form**

Replace `src/ui/pages/NewMatch.tsx` with:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import type { BestOf, Ruleset, Team } from "../../domain/types.ts";
import { initMatchState } from "../../domain/tennis.ts";
import { createMatch } from "../../storage/matchRepo.ts";
import { appendEvent } from "../../storage/eventRepo.ts";
import type { MatchCreatedEvent } from "../../domain/types.ts";

export default function NewMatch() {
  const navigate = useNavigate();
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [tiebreak, setTiebreak] = useState<"none" | "7pt">("7pt");
  const [matchType, setMatchType] = useState<"singles" | "doubles">("singles");
  const [firstServer, setFirstServer] = useState<"A" | "B">("A");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const matchId = crypto.randomUUID();
    const ruleset: Ruleset = { bestOf, tiebreak, matchType };
    const teamA: Team = {
      teamId: "A",
      players: [{ playerId: crypto.randomUUID(), displayName: teamAName }],
    };
    const teamB: Team = {
      teamId: "B",
      players: [{ playerId: crypto.randomUUID(), displayName: teamBName }],
    };

    const now = new Date().toISOString();

    // Persist match record
    await createMatch({
      matchId,
      ruleset,
      teams: { A: teamA, B: teamB },
      initialServer: firstServer,
      status: "in_progress",
      createdAt: now,
      updatedAt: now,
    });

    // Persist MATCH_CREATED event
    const event: MatchCreatedEvent = {
      eventId: crypto.randomUUID(),
      matchId,
      createdAt: now,
      seq: 0,
      type: "MATCH_CREATED",
      payload: { ruleset, teams: { A: teamA, B: teamB }, initialServer: firstServer },
    };
    await appendEvent(event);

    navigate(`/match/${matchId}`);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-center">New Match</h1>

        {/* Team Names */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Team A</label>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              className="w-full bg-gray-800 rounded px-3 py-2 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Team B</label>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              className="w-full bg-gray-800 rounded px-3 py-2 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Best Of */}
        <div>
          <label className="block text-sm font-medium mb-2">Best Of</label>
          <div className="flex gap-3">
            {([1, 3, 5] as BestOf[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBestOf(n)}
                className={`flex-1 py-2 rounded font-bold ${
                  bestOf === n ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Tiebreak */}
        <div>
          <label className="block text-sm font-medium mb-2">Tiebreak</label>
          <div className="flex gap-3">
            {(["none", "7pt"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTiebreak(t)}
                className={`flex-1 py-2 rounded font-bold ${
                  tiebreak === t ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                {t === "none" ? "None" : "7-point"}
              </button>
            ))}
          </div>
        </div>

        {/* Match Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Match Type</label>
          <div className="flex gap-3">
            {(["singles", "doubles"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMatchType(t)}
                className={`flex-1 py-2 rounded font-bold capitalize ${
                  matchType === t ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* First Server */}
        <div>
          <label className="block text-sm font-medium mb-2">First Server</label>
          <div className="flex gap-3">
            {(["A", "B"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFirstServer(s)}
                className={`flex-1 py-2 rounded font-bold ${
                  firstServer === s ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                {s === "A" ? teamAName : teamBName}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-green-600 hover:bg-green-700 rounded font-bold text-lg"
        >
          Start Match
        </button>
      </form>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/ui/pages/NewMatch.tsx && git commit -m "feat: implement match creation form"
```

---

### Task 11: Scoreboard Component

**Files:**
- Create: `src/ui/components/Scoreboard.tsx`

**Step 1: Implement the scoreboard header**

Create `src/ui/components/Scoreboard.tsx`:

```tsx
import type { MatchState, SetState } from "../../domain/types.ts";

function formatPointScore(game: SetState["game"], side: "A" | "B"): string {
  if (game.kind === "tiebreak") {
    return String(side === "A" ? game.tbA : game.tbB);
  }
  const points = side === "A" ? game.pointsA : game.pointsB;
  return points === "AD" ? "AD" : String(points);
}

type Props = {
  state: MatchState;
};

export default function Scoreboard({ state }: Props) {
  const currentSet = state.sets[state.currentSetIndex];
  const teamAName = state.teams.A.players.map((p) => p.displayName).join(" / ");
  const teamBName = state.teams.B.players.map((p) => p.displayName).join(" / ");

  return (
    <div className="bg-gray-800 p-3 text-center space-y-2">
      {/* Sets summary */}
      <div className="flex justify-center gap-4 text-sm text-gray-400">
        {state.sets.map((set, i) => (
          <span key={i} className={i === state.currentSetIndex ? "text-white font-bold" : ""}>
            {set.gamesA}-{set.gamesB}
          </span>
        ))}
      </div>

      {/* Current game score */}
      <div className="flex justify-between items-center text-lg font-bold px-4">
        <div className="flex items-center gap-2">
          {state.server === "A" && <span className="text-yellow-400 text-xs">●</span>}
          <span>{teamAName}</span>
        </div>
        <div className="text-2xl font-mono">
          {formatPointScore(currentSet.game, "A")} - {formatPointScore(currentSet.game, "B")}
        </div>
        <div className="flex items-center gap-2">
          <span>{teamBName}</span>
          {state.server === "B" && <span className="text-yellow-400 text-xs">●</span>}
        </div>
      </div>

      {/* Tiebreak indicator */}
      {currentSet.game.kind === "tiebreak" && (
        <div className="text-xs text-yellow-400">TIEBREAK</div>
      )}
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/ui/components/Scoreboard.tsx && git commit -m "feat: add Scoreboard component"
```

---

### Task 12: ScoreButton Component

**Files:**
- Create: `src/ui/components/ScoreButton.tsx`

**Step 1: Implement the giant score button**

Create `src/ui/components/ScoreButton.tsx`:

```tsx
import type { SetState, TeamSide } from "../../domain/types.ts";

function getDisplayScore(game: SetState["game"], side: TeamSide): string {
  if (game.kind === "tiebreak") {
    return String(side === "A" ? game.tbA : game.tbB);
  }
  const points = side === "A" ? game.pointsA : game.pointsB;
  return points === "AD" ? "AD" : String(points);
}

type Props = {
  teamName: string;
  side: TeamSide;
  game: SetState["game"];
  disabled: boolean;
  onScore: () => void;
};

export default function ScoreButton({ teamName, side, game, disabled, onScore }: Props) {
  const score = getDisplayScore(game, side);

  return (
    <button
      onClick={onScore}
      disabled={disabled}
      className={`flex-1 flex flex-col items-center justify-center gap-4 text-white transition-colors ${
        side === "A"
          ? "bg-blue-700 hover:bg-blue-600 active:bg-blue-500"
          : "bg-red-700 hover:bg-red-600 active:bg-red-500"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="text-xl font-bold">{teamName}</span>
      <span className="text-7xl font-mono font-bold">{score}</span>
    </button>
  );
}
```

**Step 2: Verify it compiles**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/ui/components/ScoreButton.tsx && git commit -m "feat: add ScoreButton component"
```

---

### Task 13: Scoring Page — Full Implementation

**Files:**
- Modify: `src/ui/pages/Scoring.tsx`

**Step 1: Implement the scoring page with event-sourced data flow**

Replace `src/ui/pages/Scoring.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import type { MatchState, PointWonEvent, UndoEvent, MatchEvent, TeamSide } from "../../domain/types.ts";
import { applyPointWon, replay, getEffectiveEvents } from "../../domain/tennis.ts";
import { getMatchEvents, appendEvent, getNextSeq } from "../../storage/eventRepo.ts";
import { updateMatchStatus } from "../../storage/matchRepo.ts";
import Scoreboard from "../components/Scoreboard.tsx";
import ScoreButton from "../components/ScoreButton.tsx";

export default function Scoring() {
  const { id } = useParams<{ id: string }>();
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [allEvents, setAllEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Load match state from events on mount
  useEffect(() => {
    if (!id) return;
    async function load() {
      const events = await getMatchEvents(id!);
      setAllEvents(events);
      if (events.length > 0) {
        const effective = getEffectiveEvents(events);
        const state = replay(effective);
        setMatchState(state);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleScore(team: TeamSide) {
    if (!matchState || matchState.status === "finished" || !id) return;

    const seq = await getNextSeq(id);
    const event: PointWonEvent = {
      eventId: crypto.randomUUID(),
      matchId: id,
      createdAt: new Date().toISOString(),
      seq,
      type: "POINT_WON",
      payload: { team },
    };

    // Persist first
    await appendEvent(event);

    // Then update state
    const newState = applyPointWon(matchState, team);
    setMatchState(newState);
    setAllEvents((prev) => [...prev, event]);

    // If match just ended, update match record
    if (newState.status === "finished") {
      await updateMatchStatus(id, "finished");
    }
  }

  async function handleUndo() {
    if (!matchState || !id) return;

    // Find last active POINT_WON event
    const effective = getEffectiveEvents(allEvents);
    const lastPoint = [...effective].reverse().find((e) => e.type === "POINT_WON");
    if (!lastPoint) return;

    const seq = await getNextSeq(id);
    const undoEvent: UndoEvent = {
      eventId: crypto.randomUUID(),
      matchId: id,
      createdAt: new Date().toISOString(),
      seq,
      type: "UNDO",
      payload: { targetEventId: lastPoint.eventId },
    };

    // Persist first
    await appendEvent(undoEvent);

    // Full replay after undo
    const newAllEvents = [...allEvents, undoEvent];
    setAllEvents(newAllEvents);
    const newEffective = getEffectiveEvents(newAllEvents);
    const newState = replay(newEffective);
    setMatchState(newState);

    // If match was finished but undo reverts it
    if (newState.status === "in_progress" && matchState.status === "finished") {
      await updateMatchStatus(id, "in_progress");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (!matchState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Match not found</p>
      </div>
    );
  }

  const currentSet = matchState.sets[matchState.currentSetIndex];
  const isFinished = matchState.status === "finished";
  const teamAName = matchState.teams.A.players.map((p) => p.displayName).join(" / ");
  const teamBName = matchState.teams.B.players.map((p) => p.displayName).join(" / ");

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Scoreboard header */}
      <Scoreboard state={matchState} />

      {/* Match finished overlay */}
      {isFinished && (
        <div className="bg-green-800 p-4 text-center">
          <p className="text-2xl font-bold">
            {matchState.winner === "A" ? teamAName : teamBName} wins!
          </p>
          <Link to="/new" className="inline-block mt-2 text-blue-300 underline">
            New Match
          </Link>
        </div>
      )}

      {/* Giant score buttons */}
      <div className="flex flex-1">
        <ScoreButton
          teamName={teamAName}
          side="A"
          game={currentSet.game}
          disabled={isFinished}
          onScore={() => handleScore("A")}
        />
        <ScoreButton
          teamName={teamBName}
          side="B"
          game={currentSet.game}
          disabled={isFinished}
          onScore={() => handleScore("B")}
        />
      </div>

      {/* Undo button */}
      <button
        onClick={handleUndo}
        disabled={isFinished || getEffectiveEvents(allEvents).filter(e => e.type === "POINT_WON").length === 0}
        className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed py-4 text-lg font-bold"
      >
        Undo
      </button>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 3: Verify the build succeeds**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/ui/pages/Scoring.tsx && git commit -m "feat: implement scoring page with event-sourced data flow"
```

---

### Task 14: Smoke Test & Final Verification

**Files:** None (verification only)

**Step 1: Run all domain tests**

Run: `bunx vitest run`
Expected: All tests PASS

**Step 2: Run the full build**

Run: `bun run build`
Expected: Build succeeds with no errors

**Step 3: Run lint**

Run: `bun run lint`
Expected: No errors (warnings acceptable for unused vars in boilerplate)

**Step 4: Manual smoke test**

Run: `bun run dev`

Test flow:
1. Open `http://localhost:5173` → should redirect to `/new`
2. Fill in team names, select options, click "Start Match"
3. Tap left/right to score points — verify score updates
4. Verify deuce/advantage display
5. Verify set transitions
6. Tap "Undo" — verify it reverses the last point
7. Refresh the page — verify state is preserved (IndexedDB)
8. Play through to match completion — verify winner display

**Step 5: Fix any issues found**

Address any bugs found during smoke testing.

**Step 6: Final commit**

```bash
git add -A && git commit -m "chore: final cleanup and verification"
```
