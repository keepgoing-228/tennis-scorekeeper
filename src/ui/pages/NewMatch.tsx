import { useState } from "react";
import { useNavigate, Link } from "react-router";
import type { BestOf, Ruleset, Team } from "../../domain/types.ts";
import { createMatch } from "../../storage/matchRepo.ts";
import { appendEvent } from "../../storage/eventRepo.ts";
import type { MatchCreatedEvent } from "../../domain/types.ts";

export default function NewMatch() {
  const navigate = useNavigate();
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [tiebreak, setTiebreak] = useState<"none" | "7pt">("7pt");
  const [matchType, setMatchType] = useState<"singles" | "doubles">("singles");
  const [firstServer, setFirstServer] = useState<"A" | "B">("A");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const matchId = crypto.randomUUID();
    const ruleset: Ruleset = { bestOf, tiebreak, matchType };
    const teamA: Team = {
      teamId: "A",
      players: [{ playerId: crypto.randomUUID(), displayName: teamAName }],
    };
    const teamB: Team = {
      teamId: "B",
      players: [{ playerId: crypto.randomUUID(), displayName: teamBName }],
    };

    const now = new Date().toISOString();

    await createMatch({
      matchId,
      ruleset,
      teams: { A: teamA, B: teamB },
      initialServer: firstServer,
      status: "in_progress",
      createdAt: now,
      updatedAt: now,
    });

    const event: MatchCreatedEvent = {
      eventId: crypto.randomUUID(),
      matchId,
      createdAt: now,
      seq: 0,
      type: "MATCH_CREATED",
      payload: { ruleset, teams: { A: teamA, B: teamB }, initialServer: firstServer },
    };
    await appendEvent(event);

    navigate(`/match/${matchId}`);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-center">New Match</h1>
        <Link
          to="/history"
          className="block text-center text-blue-400 hover:text-blue-300 text-sm"
        >
          Match History
        </Link>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Team A</label>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              className="w-full bg-gray-800 rounded px-3 py-2 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Team B</label>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              className="w-full bg-gray-800 rounded px-3 py-2 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Best Of</label>
          <div className="flex gap-3">
            {([1, 3, 5] as BestOf[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBestOf(n)}
                className={`flex-1 py-2 rounded font-bold ${
                  bestOf === n ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setBestOf("practice")}
              className={`flex-1 py-2 rounded font-bold ${
                bestOf === "practice" ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              Practice
            </button>
          </div>
        </div>

        {bestOf !== "practice" && (
          <div>
            <label className="block text-sm font-medium mb-2">Tiebreak</label>
            <div className="flex gap-3">
              {(["none", "7pt"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTiebreak(t)}
                  className={`flex-1 py-2 rounded font-bold ${
                    tiebreak === t ? "bg-blue-600" : "bg-gray-700"
                  }`}
                >
                  {t === "none" ? "None" : "7-point"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Match Type</label>
          <div className="flex gap-3">
            {(["singles", "doubles"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMatchType(t)}
                className={`flex-1 py-2 rounded font-bold capitalize ${
                  matchType === t ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">First Server</label>
          <div className="flex gap-3">
            {(["A", "B"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFirstServer(s)}
                className={`flex-1 py-2 rounded font-bold ${
                  firstServer === s ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                {s === "A" ? teamAName : teamBName}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-green-600 hover:bg-green-700 rounded font-bold text-lg"
        >
          Start Match
        </button>
      </form>
    </div>
  );
}
