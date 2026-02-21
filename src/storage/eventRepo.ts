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
