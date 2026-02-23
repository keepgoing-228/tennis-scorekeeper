import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import type { MatchState, PointWonEvent, UndoEvent, MatchEvent, TeamSide, PointAnnotatedEvent, PointLossReason } from "../../domain/types.ts";
import { applyPointWon, replay, getEffectiveEvents } from "../../domain/tennis.ts";
import { getMatchEvents, appendEvent, getNextSeq } from "../../storage/eventRepo.ts";
import { updateMatchStatus } from "../../storage/matchRepo.ts";
import Scoreboard from "../components/Scoreboard.tsx";
import ScoreButton from "../components/ScoreButton.tsx";
import AnnotationBar from "../components/AnnotationBar.tsx";

export default function Scoring() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [allEvents, setAllEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const canUndo = useMemo(
    () => getEffectiveEvents(allEvents).some((e) => e.type === "POINT_WON"),
    [allEvents],
  );

  const lastPointEventId = useMemo(() => {
    const effective = getEffectiveEvents(allEvents);
    const lastPoint = [...effective].reverse().find((e) => e.type === "POINT_WON");
    return lastPoint?.eventId ?? null;
  }, [allEvents]);

  const isLastPointAnnotated = useMemo(() => {
    if (!lastPointEventId) return true;
    return allEvents.some(
      (e) => e.type === "POINT_ANNOTATED" && e.payload.pointEventId === lastPointEventId
    );
  }, [allEvents, lastPointEventId]);

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

  async function handleAnnotate(reason: PointLossReason) {
    if (!id || !lastPointEventId || isLastPointAnnotated) return;

    const seq = await getNextSeq(id);
    const event: PointAnnotatedEvent = {
      eventId: crypto.randomUUID(),
      matchId: id,
      createdAt: new Date().toISOString(),
      seq,
      type: "POINT_ANNOTATED",
      payload: { pointEventId: lastPointEventId, reason },
    };

    await appendEvent(event);
    setAllEvents((prev) => [...prev, event]);
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
        <div className="flex items-center justify-center py-6 px-4">
          <div className="bg-green-900/60 border border-green-700/40 rounded-xl px-6 py-4 text-center">
            <p className="text-2xl font-bold text-green-200">
              {matchState.winner === "A" ? teamAName : teamBName} wins!
            </p>
            <Link
              to="/new"
              className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              New Match
            </Link>
          </div>
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

      {/* Annotation bar */}
      {lastPointEventId && !isLastPointAnnotated && (
        <AnnotationBar onSelect={handleAnnotate} />
      )}

      {/* Bottom action buttons */}
      <div className="flex gap-px bg-gray-950">
        <button
          onClick={async () => {
            if (window.confirm("Cancel this match and start a new one?")) {
              if (id) await updateMatchStatus(id, "cancelled");
              navigate("/new");
            }
          }}
          className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3.5 text-sm font-semibold text-red-400 transition-colors duration-150"
        >
          Restart
        </button>
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed py-3.5 text-sm font-semibold text-gray-300 transition-colors duration-150"
        >
          ↩ Undo
        </button>
      </div>
    </div>
  );
}
