import { describe, it, expect } from "vitest";
import { initMatchState, applyPointWon, getEffectiveEvents, replay, computeMatchStats } from "./tennis.ts";
import type { Ruleset, Team, MatchState, TeamSide, PointWonEvent, MatchCreatedEvent, UndoEvent, MatchEvent, PointAnnotatedEvent } from "./types.ts";

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

describe("deuce and advantage", () => {
  it("enters deuce at 40-40", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = scorePoints(state, ["A", "A", "A", "B", "B", "B"]);
    expect(state.sets[0].game).toMatchObject({ pointsA: 40, pointsB: 40, deuce: true });
  });

  it("advantage to scorer from deuce", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = scorePoints(state, ["A", "A", "A", "B", "B", "B"]);
    state = applyPointWon(state, "A");
    expect(state.sets[0].game).toMatchObject({ pointsA: "AD", pointsB: 40, deuce: true });
  });

  it("back to deuce when advantage is lost", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = scorePoints(state, ["A", "A", "A", "B", "B", "B"]);
    state = applyPointWon(state, "A");
    state = applyPointWon(state, "B");
    expect(state.sets[0].game).toMatchObject({ pointsA: 40, pointsB: 40, deuce: true });
  });

  it("wins game from advantage", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = scorePoints(state, ["A", "A", "A", "B", "B", "B"]);
    state = applyPointWon(state, "B");
    state = applyPointWon(state, "B");
    expect(state.sets[0].gamesB).toBe(1);
    expect(state.sets[0].game).toEqual({ kind: "normal", pointsA: 0, pointsB: 0, deuce: false });
  });
});

describe("server rotation", () => {
  it("alternates server after each game", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    expect(state.server).toBe("A");
    state = scorePoints(state, ["A", "A", "A", "A"]);
    expect(state.server).toBe("B");
    state = scorePoints(state, ["B", "B", "B", "B"]);
    expect(state.server).toBe("A");
  });
});

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
    state = winGames(state, "A", 5);
    state = winGames(state, "B", 5);
    state = winGames(state, "A", 1);
    expect(state.setsWonA).toBe(0);
    expect(state.sets[0].gamesA).toBe(6);
    expect(state.sets[0].gamesB).toBe(5);
  });

  it("enters tiebreak at 6-6 when tiebreak enabled", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = winGames(state, "A", 5);
    state = winGames(state, "B", 5);
    state = winGames(state, "A", 1);
    state = winGames(state, "B", 1);
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
    state = winGames(state, "A", 2);
    expect(state.setsWonA).toBe(1);
  });
});

describe("tiebreak", () => {
  function reachTiebreak(): MatchState {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = winGames(state, "A", 5);
    state = winGames(state, "B", 5);
    state = winGames(state, "A", 1);
    state = winGames(state, "B", 1);
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
    for (let i = 0; i < 6; i++) {
      state = applyPointWon(state, "A");
      state = applyPointWon(state, "B");
    }
    expect(state.sets[0].game.kind).toBe("tiebreak");
    state = applyPointWon(state, "A");
    expect(state.sets[0].game.kind).toBe("tiebreak");
    state = applyPointWon(state, "A");
    expect(state.setsWonA).toBe(1);
  });
});

function winSet_helper(state: MatchState, team: TeamSide): MatchState {
  return winGames(state, team, 6);
}

describe("match win", () => {
  it("wins best-of-3 match after 2 sets", () => {
    let state = initMatchState("m1", defaultRuleset, { A: teamA, B: teamB }, "A");
    state = winSet_helper(state, "A");
    state = winSet_helper(state, "A");
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
      makeUndoEvent("m1", 3, "evt-2"),
    ];
    const effective = getEffectiveEvents(events);
    expect(effective).toHaveLength(2);
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
      makeUndoEvent("m1", 3, "evt-2"),
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

const practiceRuleset: Ruleset = {
  bestOf: "practice",
  tiebreak: "7pt",
  matchType: "singles",
};

describe("practice tiebreak mode", () => {
  it("starts in tiebreak state", () => {
    const state = initMatchState("m1", practiceRuleset, { A: teamA, B: teamB }, "A");
    expect(state.sets[0].game.kind).toBe("tiebreak");
    if (state.sets[0].game.kind === "tiebreak") {
      expect(state.sets[0].game.tbA).toBe(0);
      expect(state.sets[0].game.tbB).toBe(0);
      expect(state.sets[0].game.target).toBe(7);
    }
  });

  it("scores tiebreak points", () => {
    let state = initMatchState("m1", practiceRuleset, { A: teamA, B: teamB }, "A");
    state = applyPointWon(state, "A");
    if (state.sets[0].game.kind === "tiebreak") {
      expect(state.sets[0].game.tbA).toBe(1);
      expect(state.sets[0].game.tbB).toBe(0);
    }
  });

  it("wins at exactly 7 points with no margin required (7-6)", () => {
    let state = initMatchState("m1", practiceRuleset, { A: teamA, B: teamB }, "A");
    // Score to 6-6
    for (let i = 0; i < 6; i++) {
      state = applyPointWon(state, "A");
      state = applyPointWon(state, "B");
    }
    // A scores 7th point → 7-6 → A wins (no margin needed)
    state = applyPointWon(state, "A");
    expect(state.status).toBe("finished");
    expect(state.winner).toBe("A");
  });

  it("does not create a second set after practice tiebreak", () => {
    let state = initMatchState("m1", practiceRuleset, { A: teamA, B: teamB }, "A");
    for (let i = 0; i < 7; i++) {
      state = applyPointWon(state, "B");
    }
    expect(state.status).toBe("finished");
    expect(state.winner).toBe("B");
    expect(state.sets).toHaveLength(1);
  });

  it("tracks server rotation in practice tiebreak", () => {
    let state = initMatchState("m1", practiceRuleset, { A: teamA, B: teamB }, "A");
    expect(state.server).toBe("A");
    // After 1st point, server changes
    state = applyPointWon(state, "A");
    expect(state.server).toBe("B");
    // After 2nd point, no change
    state = applyPointWon(state, "A");
    expect(state.server).toBe("B");
    // After 3rd point, server changes
    state = applyPointWon(state, "A");
    expect(state.server).toBe("A");
  });
});

function makePointAnnotatedEvent(matchId: string, seq: number, pointEventId: string, reason: "DOUBLE_FAULT" | "ACE" | "FOREHAND_ERROR" | "BACKHAND_ERROR" | "VOLLEY_ERROR" | "OUT_OF_BOUNDS" | "NET_ERROR" | "WINNER"): PointAnnotatedEvent {
  return {
    eventId: `evt-${seq}`,
    matchId,
    createdAt: new Date().toISOString(),
    seq,
    type: "POINT_ANNOTATED",
    payload: { pointEventId, reason },
  };
}

describe("POINT_ANNOTATED in replay", () => {
  it("ignores POINT_ANNOTATED events during replay", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A"),
      makePointAnnotatedEvent("m1", 2, "evt-1", "ACE"),
      makePointWonEvent("m1", 3, "B"),
    ];
    const state = replay(events);
    expect(state.sets[0].game).toMatchObject({ pointsA: 15, pointsB: 15 });
  });

  it("excludes POINT_ANNOTATED from effective events", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A"),
      makePointAnnotatedEvent("m1", 2, "evt-1", "DOUBLE_FAULT"),
    ];
    const effective = getEffectiveEvents(events);
    expect(effective).toHaveLength(2);
    expect(effective.every(e => e.type !== "POINT_ANNOTATED")).toBe(true);
  });
});

describe("computeMatchStats", () => {
  it("computes stats from annotated points", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A"),
      makePointAnnotatedEvent("m1", 2, "evt-1", "ACE"),
      makePointWonEvent("m1", 3, "B"),
      makePointAnnotatedEvent("m1", 4, "evt-3", "FOREHAND_ERROR"),
      makePointWonEvent("m1", 5, "A"),
    ];
    const stats = computeMatchStats(events);

    expect(stats.A.totalPointsWon).toBe(2);
    expect(stats.B.totalPointsWon).toBe(1);
    expect(stats.A.ACE).toBe(1);
    expect(stats.B.FOREHAND_ERROR).toBe(1);
    expect(stats.A.unannotated).toBe(1);
    expect(stats.B.unannotated).toBe(0);
  });

  it("ignores annotations for undone points", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A"),
      makePointAnnotatedEvent("m1", 2, "evt-1", "ACE"),
      makeUndoEvent("m1", 3, "evt-1"),
    ];
    const stats = computeMatchStats(events);
    expect(stats.A.totalPointsWon).toBe(0);
    expect(stats.A.ACE).toBe(0);
  });

  it("returns zero stats when no points scored", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
    ];
    const stats = computeMatchStats(events);
    expect(stats.A.totalPointsWon).toBe(0);
    expect(stats.B.totalPointsWon).toBe(0);
  });
});
