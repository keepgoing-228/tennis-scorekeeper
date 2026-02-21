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

export async function getCompletedMatches(): Promise<MatchRecord[]> {
  return db.matches.where("status").equals("finished").reverse().sortBy("createdAt");
}
