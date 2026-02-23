import type { SetState, TeamSide } from "../../domain/types.ts";

function getDisplayScore(game: SetState["game"], side: TeamSide): string {
  if (game.kind === "tiebreak") {
    return String(side === "A" ? game.tbA : game.tbB);
  }
  const points = side === "A" ? game.pointsA : game.pointsB;
  return points === "AD" ? "AD" : String(points);
}

type Props = {
  teamName: string;
  side: TeamSide;
  game: SetState["game"];
  disabled: boolean;
  onScore: () => void;
};

export default function ScoreButton({ teamName, side, game, disabled, onScore }: Props) {
  const score = getDisplayScore(game, side);

  return (
    <button
      onClick={onScore}
      disabled={disabled}
      className={`flex-1 flex flex-col items-center justify-center gap-3 text-white transition-colors duration-150 ${
        side === "A"
          ? "bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border-r border-slate-700/50"
          : "bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border-l border-stone-700/50"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="text-sm font-semibold tracking-wide text-gray-300 uppercase">
        {teamName}
      </span>
      <span className="text-8xl font-mono font-bold tabular-nums">{score}</span>
    </button>
  );
}
