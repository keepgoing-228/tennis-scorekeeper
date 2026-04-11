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

export type SavedPlayer = {
  playerId: string;
  displayName: string;
  createdAt: string;
};

const db = new Dexie("TennisScorekeeper") as Dexie & {
  matches: EntityTable<MatchRecord, "matchId">;
  events: EntityTable<EventRecord, "eventId">;
  players: EntityTable<SavedPlayer, "playerId">;
};

db.version(1).stores({
  matches: "matchId, status, createdAt",
  events: "eventId, [matchId+seq], matchId",
});

db.version(2).stores({
  matches: "matchId, status, createdAt",
  events: "eventId, [matchId+seq], matchId",
  players: "playerId, displayName, createdAt",
});

export { db };
