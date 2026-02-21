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
