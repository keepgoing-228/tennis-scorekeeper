import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import type { MatchState, PointWonEvent, UndoEvent, MatchEvent, TeamSide, PointLossReason } from "../../domain/types.ts";
import { applyPointWon, replay, getEffectiveEvents, computePlayerStats } from "../../domain/tennis.ts";
import StatsDrawer from "../components/StatsDrawer.tsx";
import { getMatchEvents, appendEvent, getNextSeq } from "../../storage/eventRepo.ts";
import { updateMatchStatus } from "../../storage/matchRepo.ts";
import Scoreboard from "../components/Scoreboard.tsx";
import ScoreButton from "../components/ScoreButton.tsx";
import AnnotationBar from "../components/AnnotationBar.tsx";
import PlayerAttributionPopup from "../components/PlayerAttributionPopup.tsx";
import { useTranslation } from "react-i18next";
import { uuid } from "../../utils/uuid.ts";

const WINNER_ANNOTATIONS: Set<PointLossReason> = new Set(["ACE", "WINNER"]);

export default function Scoring() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [allEvents, setAllEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapped, setSwapped] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    side: TeamSide;
    scoringTeam: TeamSide;
    annotation: PointLossReason;
  } | null>(null);
  const [showStats, setShowStats] = useState(false);

  const canUndo = useMemo(
    () => getEffectiveEvents(allEvents).some((e) => e.type === "POINT_WON"),
    [allEvents],
  );

  const playerStats = useMemo(
    () => computePlayerStats(allEvents),
    [allEvents],
  );

  const { t } = useTranslation();

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

  async function handleScore(team: TeamSide, annotation?: PointLossReason, playerId?: string) {
    if (!matchState || matchState.status === "finished" || !id) return;

    const seq = await getNextSeq(id);
    const payload: PointWonEvent["payload"] = { team };
    if (annotation) payload.annotation = annotation;
    if (playerId) payload.playerId = playerId;

    const event: PointWonEvent = {
      eventId: uuid(),
      matchId: id,
      createdAt: new Date().toISOString(),
      seq,
      type: "POINT_WON",
      payload,
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

  function handleAnnotatedScore(side: TeamSide, reason: PointLossReason) {
    // Winner annotations (Ace, Winner) → point to the player who performed it
    // Error annotations → point to opponent
    const scoringTeam = WINNER_ANNOTATIONS.has(reason)
      ? side
      : side === "A" ? "B" : "A";

    const isDoubles = matchState?.ruleset.matchType === "doubles";
    if (isDoubles) {
      setPendingAnnotation({ side, scoringTeam, annotation: reason });
    } else {
      handleScore(scoringTeam, reason);
    }
  }

  function handlePlayerSelected(playerId: string) {
    if (!pendingAnnotation) return;
    handleScore(pendingAnnotation.scoringTeam, pendingAnnotation.annotation, playerId);
    setPendingAnnotation(null);
  }

  function handleSkipAttribution() {
    if (!pendingAnnotation) return;
    handleScore(pendingAnnotation.scoringTeam, pendingAnnotation.annotation);
    setPendingAnnotation(null);
  }

  async function handleUndo() {
    if (!matchState || !id) return;

    // Find last active POINT_WON event
    const effective = getEffectiveEvents(allEvents);
    const lastPoint = [...effective].reverse().find((e) => e.type === "POINT_WON");
    if (!lastPoint) return;

    const seq = await getNextSeq(id);
    const undoEvent: UndoEvent = {
      eventId: uuid(),
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
        <p className="text-xl">{t('loading')}</p>
      </div>
    );
  }

  if (!matchState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">{t('matchNotFound')}</p>
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
      <Scoreboard state={matchState} swapped={swapped} />

      {/* Match finished overlay */}
      {isFinished && (
        <div className="flex items-center justify-center py-6 px-4">
          <div className="bg-green-900/60 border border-green-700/40 rounded-xl px-6 py-4 text-center">
            <p className="text-2xl font-bold text-green-200">
              {t('teamWins', { teamName: matchState.winner === "A" ? teamAName : teamBName })}
            </p>
            <Link
              to="/new"
              className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {t('newMatch')}
            </Link>
          </div>
        </div>
      )}

      {/* Two-column scoring layout */}
      {(() => {
        const leftSide: TeamSide = swapped ? "B" : "A";
        const rightSide: TeamSide = swapped ? "A" : "B";
        const leftName = swapped ? teamBName : teamAName;
        const rightName = swapped ? teamAName : teamBName;
        return (
          <div className="flex flex-1">
            <div className="flex-1 flex flex-col border-r border-gray-700/40">
              <ScoreButton
                teamName={leftName}
                side={leftSide}
                game={currentSet.game}
                disabled={isFinished}
                onScore={() => handleScore(leftSide)}
              />
              <AnnotationBar
                side={leftSide}
                disabled={isFinished}
                onSelect={(reason) => handleAnnotatedScore(leftSide, reason)}
              />
            </div>
            <div className="flex-1 flex flex-col">
              <ScoreButton
                teamName={rightName}
                side={rightSide}
                game={currentSet.game}
                disabled={isFinished}
                onScore={() => handleScore(rightSide)}
              />
              <AnnotationBar
                side={rightSide}
                disabled={isFinished}
                onSelect={(reason) => handleAnnotatedScore(rightSide, reason)}
              />
            </div>
          </div>
        );
      })()}

      {pendingAnnotation && matchState && (
        <PlayerAttributionPopup
          players={matchState.teams[pendingAnnotation.side].players}
          annotation={pendingAnnotation.annotation}
          onSelect={handlePlayerSelected}
          onSkip={handleSkipAttribution}
        />
      )}

      {/* Bottom action buttons */}
      <div className="flex gap-px bg-gray-950">
        <button
          onClick={async () => {
            if (window.confirm(t('confirmCancel'))) {
              if (id) await updateMatchStatus(id, "cancelled");
              navigate("/new");
            }
          }}
          className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3.5 text-sm font-semibold text-red-400 transition-colors duration-150"
        >
          {t('restart')}
        </button>
        <button
          onClick={() => setSwapped((s) => !s)}
          className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3.5 text-sm font-semibold text-gray-300 transition-colors duration-150"
        >
          {t('swap')}
        </button>
        {matchState.ruleset.matchType === "doubles" && (
          <button
            onClick={() => setShowStats(true)}
            className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3.5 text-sm font-semibold text-green-400 transition-colors duration-150"
          >
            {t('stats')}
          </button>
        )}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed py-3.5 text-sm font-semibold text-gray-300 transition-colors duration-150"
        >
          {t('undo')}
        </button>
      </div>
      {showStats && matchState.ruleset.matchType === "doubles" && (
        <StatsDrawer
          teams={matchState.teams}
          playerStats={playerStats}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  );
}
