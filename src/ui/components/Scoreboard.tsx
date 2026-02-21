import type { MatchState, SetState } from "../../domain/types.ts";

function formatPointScore(game: SetState["game"], side: "A" | "B"): string {
  if (game.kind === "tiebreak") {
    return String(side === "A" ? game.tbA : game.tbB);
  }
  const points = side === "A" ? game.pointsA : game.pointsB;
  return points === "AD" ? "AD" : String(points);
}

type Props = {
  state: MatchState;
};

export default function Scoreboard({ state }: Props) {
  const currentSet = state.sets[state.currentSetIndex];
  const teamAName = state.teams.A.players.map((p) => p.displayName).join(" / ");
  const teamBName = state.teams.B.players.map((p) => p.displayName).join(" / ");

  return (
    <div className="bg-gray-800 p-3 text-center space-y-2">
      {state.ruleset.bestOf === "practice" ? (
        <div className="text-sm text-yellow-400 font-bold">Practice Tiebreak</div>
      ) : (
        <div className="flex justify-center gap-4 text-sm text-gray-400">
          {state.sets.map((set, i) => (
            <span key={i} className={i === state.currentSetIndex ? "text-white font-bold" : ""}>
              {set.gamesA}-{set.gamesB}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center text-lg font-bold px-4">
        <div className="flex items-center gap-2">
          {state.server === "A" && <span className="text-yellow-400 text-xs">●</span>}
          <span>{teamAName}</span>
        </div>
        <div className="text-2xl font-mono">
          {formatPointScore(currentSet.game, "A")} - {formatPointScore(currentSet.game, "B")}
        </div>
        <div className="flex items-center gap-2">
          <span>{teamBName}</span>
          {state.server === "B" && <span className="text-yellow-400 text-xs">●</span>}
        </div>
      </div>

      {currentSet.game.kind === "tiebreak" && state.ruleset.bestOf !== "practice" && (
        <div className="text-xs text-yellow-400">TIEBREAK</div>
      )}
    </div>
  );
}
