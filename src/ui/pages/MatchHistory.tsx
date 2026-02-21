import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { MatchRecord } from "../../storage/db.ts";
import type { MatchStats } from "../../domain/tennis.ts";
import { getCompletedMatches } from "../../storage/matchRepo.ts";
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Match History</h1>
          <Link to="/new" className="text-blue-400 hover:text-blue-300 text-sm">
            New Match
          </Link>
        </div>

        {matches.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No completed matches yet.</p>
        ) : (
          <div className="space-y-2">
            {matches.map(({ record, setScores, winnerName, matchTypeLabel }) => (
              <div key={record.matchId}>
                <button
                  onClick={() => toggleExpand(record.matchId)}
                  className="w-full bg-gray-800 rounded-lg p-3 text-left hover:bg-gray-750 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">
                        {record.teams.A.players.map((p) => p.displayName).join(" / ")}
                        {" vs "}
                        {record.teams.B.players.map((p) => p.displayName).join(" / ")}
                      </div>
                      <div className="text-lg font-mono mt-1">{setScores}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-green-400">{winnerName} wins</div>
                      <div className="text-gray-400">{matchTypeLabel}</div>
                      <div className="text-gray-500">{formatDate(record.createdAt)}</div>
                    </div>
                  </div>
                </button>

                {expandedId === record.matchId && stats[record.matchId] && (
                  <StatsDetail
                    stats={stats[record.matchId]}
                    teamAName={record.teams.A.players.map((p) => p.displayName).join(" / ")}
                    teamBName={record.teams.B.players.map((p) => p.displayName).join(" / ")}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type StatsDetailProps = {
  stats: MatchStats;
  teamAName: string;
  teamBName: string;
};

const STAT_LABELS: { key: string; label: string }[] = [
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
    <div className="bg-gray-750 rounded-b-lg px-3 py-2 mt-px">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-1">&nbsp;</th>
            <th className="text-center py-1">{teamAName}</th>
            <th className="text-center py-1">{teamBName}</th>
          </tr>
        </thead>
        <tbody>
          {STAT_LABELS.map(({ key, label }) => (
            <tr key={key} className="border-b border-gray-800">
              <td className="py-1 text-gray-300">{label}</td>
              <td className="text-center font-mono">{stats.A[key as keyof typeof stats.A]}</td>
              <td className="text-center font-mono">{stats.B[key as keyof typeof stats.B]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
