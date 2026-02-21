import type { GameState, MatchState, NormalGameState, PointScore, Ruleset, Team, TeamSide, MatchEvent, PointLossReason } from "./types.ts";

const POINT_PROGRESSION: Record<number, PointScore> = { 0: 15, 15: 30, 30: 40 };

function freshGame(): GameState {
  return { kind: "normal", pointsA: 0, pointsB: 0, deuce: false };
}

function freshTiebreak(): GameState {
  return { kind: "tiebreak", tbA: 0, tbB: 0, target: 7 };
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
    sets: [{ gamesA: 0, gamesB: 0, game: ruleset.bestOf === "practice" ? freshTiebreak() : freshGame() }],
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
  if (ruleset.bestOf === "practice") return 1;
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

  // first state: tiebreak is enabled and both players have 6 games
  const needsTiebreak = state.ruleset.tiebreak === "7pt" && gamesA === 6 && gamesB === 6;

  if (needsTiebreak) {
    currentSet.game = { kind: "tiebreak", tbA: 0, tbB: 0, target: 7 };
    sets[state.currentSetIndex] = currentSet;
    // In tiebreak, server changes after first point then every 2 — handled in tiebreak scoring
    return { ...state, sets, server: otherSide(state.server) };
  }

  // second state: one player has 6 games and more than 2 games ahead
  const setWon =
    (gamesA >= 6 || gamesB >= 6) &&
    Math.abs(gamesA - gamesB) >= 2;

  if (setWon) {
    currentSet.game = freshGame(); // won't be used, but keep clean
    sets[state.currentSetIndex] = currentSet;
    return winSet(state, sets, winner);
  }

  // third state: someone has won the game but the set continues
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
    if (otherPoints === "AD") {
      // Opponent had advantage → back to deuce
      const newGame: NormalGameState = { ...game, pointsA: 40, pointsB: 40, deuce: true };
      return updateGame(state, newGame);
    }
    if (otherPoints === 40) {
      // Deuce → Advantage
      const newGame: NormalGameState = { ...game, deuce: true, [scorerKey]: "AD" as PointScore };
      return updateGame(state, newGame);
    }
    // 40 vs < 40 → win the game
    return winGame(state, team);
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
  const isPractice = state.ruleset.bestOf === "practice";
  const tiebreakWon = isPractice
    ? (newTbA >= game.target || newTbB >= game.target)
    : (newTbA >= game.target || newTbB >= game.target) && Math.abs(newTbA - newTbB) >= 2;

  if (tiebreakWon) {
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

export function getEffectiveEvents(events: MatchEvent[]): MatchEvent[] {
  const undoneIds = new Set<string>();

  for (const event of events) {
    if (event.type === "UNDO") {
      undoneIds.add(event.payload.targetEventId);
    } else if (event.type === "REDO") {
      undoneIds.delete(event.payload.targetEventId);
    }
  }

  return events.filter(
    (e) => e.type !== "UNDO" && e.type !== "REDO" && e.type !== "POINT_ANNOTATED" && !undoneIds.has(e.eventId)
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
  }

  if (!state) {
    throw new Error("No MATCH_CREATED event found and no starting state provided");
  }

  return state;
}

export type TeamStats = {
  totalPointsWon: number;
  unannotated: number;
} & Record<PointLossReason, number>;

export type MatchStats = {
  A: TeamStats;
  B: TeamStats;
};

function emptyTeamStats(): TeamStats {
  return {
    totalPointsWon: 0,
    unannotated: 0,
    DOUBLE_FAULT: 0,
    ACE: 0,
    FOREHAND_ERROR: 0,
    BACKHAND_ERROR: 0,
    VOLLEY_ERROR: 0,
    OUT_OF_BOUNDS: 0,
    NET_ERROR: 0,
    WINNER: 0,
  };
}

export function computeMatchStats(events: MatchEvent[]): MatchStats {
  const effective = getEffectiveEvents(events);
  const effectiveIds = new Set(effective.map(e => e.eventId));

  const stats: MatchStats = { A: emptyTeamStats(), B: emptyTeamStats() };

  // Build annotation map: pointEventId -> reason
  const annotations = new Map<string, PointLossReason>();
  for (const event of events) {
    if (event.type === "POINT_ANNOTATED" && effectiveIds.has(event.payload.pointEventId)) {
      annotations.set(event.payload.pointEventId, event.payload.reason);
    }
  }

  // Count points and apply annotations
  for (const event of effective) {
    if (event.type === "POINT_WON") {
      const team = event.payload.team;
      stats[team].totalPointsWon += 1;

      const reason = annotations.get(event.eventId);
      if (reason) {
        stats[team][reason] += 1;
      } else {
        stats[team].unannotated += 1;
      }
    }
  }

  return stats;
}
