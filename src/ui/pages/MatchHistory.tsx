import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { MatchRecord } from "../../storage/db.ts";
import type { MatchStats, TeamStats } from "../../domain/tennis.ts";
import { getCompletedMatches, deleteMatch } from "../../storage/matchRepo.ts";
import { getMatchEvents } from "../../storage/eventRepo.ts";
import { computeMatchStats, getEffectiveEvents, replay } from "../../domain/tennis.ts";

type MatchSummary = {
  record: MatchRecord;
  setScores: string;
  winnerName: string;
  matchTypeLabel: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMatchTypeLabel(record: MatchRecord): string {
  if (record.ruleset.bestOf === "practice") return "Practice Tiebreak";
  return `Best of ${record.ruleset.bestOf}`;
}

export default function MatchHistory() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, MatchStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const records = await getCompletedMatches();
      const summaries: MatchSummary[] = [];

      for (const record of records) {
        const events = await getMatchEvents(record.matchId);
        const effective = getEffectiveEvents(events);
        const state = replay(effective);

        const setScores = state.sets
          .map((s) => `${s.gamesA}-${s.gamesB}`)
          .join(", ");

        const winnerTeam = state.winner;
        const winnerName = winnerTeam
          ? record.teams[winnerTeam].players.map((p) => p.displayName).join(" / ")
          : "Unknown";

        summaries.push({
          record,
          setScores,
          winnerName,
          matchTypeLabel: getMatchTypeLabel(record),
        });
      }

      setMatches(summaries);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleExpand(matchId: string) {
    if (expandedId === matchId) {
      setExpandedId(null);
      return;
    }

    if (!stats[matchId]) {
      const events = await getMatchEvents(matchId);
      const matchStats = computeMatchStats(events);
      setStats((prev) => ({ ...prev, [matchId]: matchStats }));
    }

    setExpandedId(matchId);
  }

  async function handleDelete(matchId: string) {
    if (!confirm("Delete this match? This cannot be undone.")) return;
    try {
      await deleteMatch(matchId);
      setMatches((prev) => prev.filter((m) => m.record.matchId !== matchId));
      if (expandedId === matchId) setExpandedId(null);
      setStats((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    } catch (err) {
      console.error("Failed to delete match:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold tracking-tight text-center">Match History</h1>

        {matches.length === 0 ? (
          <p className="text-gray-500 text-center py-12 text-sm">
            No completed matches yet.
          </p>
        ) : (
          <div className="space-y-2">
            {matches.map(({ record, setScores, winnerName, matchTypeLabel }) => (
              <div key={record.matchId}>
                <div className="relative">
                  <button
                    onClick={() => toggleExpand(record.matchId)}
                    className="w-full bg-gray-800 rounded-lg p-3.5 text-left hover:bg-gray-750 transition-colors duration-150 border border-gray-700/30"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-sm text-gray-200">
                          {record.teams.A.players.map((p) => p.displayName).join(" / ")}
                          {" vs "}
                          {record.teams.B.players.map((p) => p.displayName).join(" / ")}
                        </div>
                        <div className="text-lg font-mono mt-1 tabular-nums">
                          {setScores}
                        </div>
                      </div>
                      <div className="text-right text-xs pr-7">
                        <div className="text-green-400 font-medium">
                          {winnerName} wins
                        </div>
                        <div className="text-gray-500 mt-0.5">{matchTypeLabel}</div>
                        <div className="text-gray-600 mt-0.5">
                          {formatDate(record.createdAt)}
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(record.matchId);
                    }}
                    className="absolute top-2.5 right-2.5 p-1 text-gray-600 hover:text-red-400 transition-colors duration-150"
                    aria-label="Delete match"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                {expandedId === record.matchId && stats[record.matchId] && (
                  <StatsDetail
                    stats={stats[record.matchId]}
                    teamAName={record.teams.A.players
                      .map((p) => p.displayName)
                      .join(" / ")}
                    teamBName={record.teams.B.players
                      .map((p) => p.displayName)
                      .join(" / ")}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <Link
          to="/new"
          className="block text-center text-sm text-gray-500 hover:text-gray-400 transition-colors"
        >
          New Match
        </Link>
      </div>
    </div>
  );
}

type StatsDetailProps = {
  stats: MatchStats;
  teamAName: string;
  teamBName: string;
};

const STAT_LABELS: { key: keyof TeamStats; label: string }[] = [
  { key: "totalPointsWon", label: "Total Points Won" },
  { key: "ACE", label: "Aces" },
  { key: "DOUBLE_FAULT", label: "Double Faults" },
  { key: "FOREHAND_ERROR", label: "Forehand Errors" },
  { key: "BACKHAND_ERROR", label: "Backhand Errors" },
  { key: "VOLLEY_ERROR", label: "Volley Errors" },
  { key: "OUT_OF_BOUNDS", label: "Out of Bounds" },
  { key: "NET_ERROR", label: "Net Errors" },
  { key: "WINNER", label: "Winners" },
  { key: "unannotated", label: "Unannotated" },
];

function StatsDetail({ stats, teamAName, teamBName }: StatsDetailProps) {
  return (
    <div className="bg-gray-800/60 rounded-b-lg px-3 py-2 mt-px border-x border-b border-gray-700/30">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-700/50">
            <th className="text-left py-1.5 font-medium">&nbsp;</th>
            <th className="text-center py-1.5 font-medium">{teamAName}</th>
            <th className="text-center py-1.5 font-medium">{teamBName}</th>
          </tr>
        </thead>
        <tbody>
          {STAT_LABELS.map(({ key, label }, i) => (
            <tr
              key={key}
              className={`border-b border-gray-800/50 ${
                i % 2 === 0 ? "bg-gray-800/30" : ""
              }`}
            >
              <td className="py-1.5 text-gray-400">{label}</td>
              <td className="text-center font-mono tabular-nums">{stats.A[key]}</td>
              <td className="text-center font-mono tabular-nums">{stats.B[key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
