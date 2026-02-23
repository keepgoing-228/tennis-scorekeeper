import type { MatchState } from "../../domain/types.ts";

type Props = {
  state: MatchState;
};

export default function Scoreboard({ state }: Props) {
  const teamAName = state.teams.A.players.map((p) => p.displayName).join(" / ");
  const teamBName = state.teams.B.players.map((p) => p.displayName).join(" / ");

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm px-4 py-3 space-y-1.5">
      {state.ruleset.bestOf === "practice" ? (
        <div className="text-sm text-yellow-400 font-semibold text-center tracking-wide">
          Practice Tiebreak
        </div>
      ) : (
        <div className="flex justify-center gap-5 text-sm text-gray-400 font-mono">
          {state.sets.map((set, i) => (
            <span
              key={i}
              className={
                i === state.currentSetIndex
                  ? "text-white font-bold"
                  : ""
              }
            >
              {set.gamesA}-{set.gamesB}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center text-base font-semibold px-2">
        <div className="flex items-center gap-2">
          {state.server === "A" && (
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          )}
          <span className="text-gray-200">{teamAName}</span>
        </div>
        <span className="text-xs text-gray-500 uppercase tracking-wider">vs</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-200">{teamBName}</span>
          {state.server === "B" && (
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          )}
        </div>
      </div>

      {state.sets[state.currentSetIndex].game.kind === "tiebreak" &&
        state.ruleset.bestOf !== "practice" && (
          <div className="text-xs text-yellow-400 text-center font-semibold tracking-widest">
            TIEBREAK
          </div>
        )}
    </div>
  );
}
