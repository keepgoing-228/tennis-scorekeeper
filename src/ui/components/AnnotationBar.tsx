import type { PointLossReason, TeamSide } from "../../domain/types.ts";

const WINNER_REASONS: { value: PointLossReason; label: string }[] = [
  { value: "ACE", label: "Ace" },
  { value: "WINNER", label: "Winner" },
];

const ERROR_REASONS: { value: PointLossReason; label: string }[] = [
  { value: "DOUBLE_FAULT", label: "Double Fault" },
  { value: "FOREHAND_ERROR", label: "FH Error" },
  { value: "BACKHAND_ERROR", label: "BH Error" },
  { value: "VOLLEY_ERROR", label: "Volley" },
  { value: "OUT_OF_BOUNDS", label: "Out" },
  { value: "NET_ERROR", label: "Net" },
];

type Props = {
  side: TeamSide;
  disabled: boolean;
  onSelect: (reason: PointLossReason) => void;
};

export default function AnnotationBar({ side, disabled, onSelect }: Props) {
  const chipBase =
    "w-full py-1.5 text-xs font-medium rounded-md transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  const winnerStyle =
    side === "A"
      ? "bg-blue-800/60 hover:bg-blue-700/60 active:bg-blue-600/60 text-blue-200"
      : "bg-red-800/60 hover:bg-red-700/60 active:bg-red-600/60 text-red-200";
  const errorStyle =
    "bg-gray-700/60 hover:bg-gray-600/60 active:bg-gray-500/60 text-gray-300";

  return (
    <div className="flex flex-col gap-1 px-1.5 pb-2">
      {WINNER_REASONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          disabled={disabled}
          className={`${chipBase} ${winnerStyle}`}
        >
          {label}
        </button>
      ))}
      <div className="h-px bg-gray-700/30 my-0.5" />
      {ERROR_REASONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          disabled={disabled}
          className={`${chipBase} ${errorStyle}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
