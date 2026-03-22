import { useTranslation } from "react-i18next";
import type { PointLossReason, TeamSide } from "../../domain/types.ts";

const WINNER_REASONS: { value: PointLossReason; labelKey: string }[] = [
  { value: "ACE", labelKey: "ace" },
  { value: "WINNER", labelKey: "winner" },
];

const ERROR_REASONS: { value: PointLossReason; labelKey: string }[] = [
  { value: "DOUBLE_FAULT", labelKey: "doubleFault" },
  { value: "FOREHAND_ERROR", labelKey: "fhError" },
  { value: "BACKHAND_ERROR", labelKey: "bhError" },
  { value: "VOLLEY_ERROR", labelKey: "volleyError" },
  { value: "OUT_OF_BOUNDS", labelKey: "outError" },
  { value: "NET_ERROR", labelKey: "netError" },
];

type Props = {
  side: TeamSide;
  disabled: boolean;
  onSelect: (reason: PointLossReason) => void;
};

export default function AnnotationBar({ side, disabled, onSelect }: Props) {
  const { t } = useTranslation();
  const chipBase =
    "w-full min-h-[44px] py-2 text-xs font-medium rounded-lg border transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const winnerStyle =
    side === "A"
      ? "border-blue-500/50 bg-blue-950/40 hover:bg-blue-800/50 active:bg-blue-700/50 text-blue-300"
      : "border-red-500/50 bg-red-950/40 hover:bg-red-800/50 active:bg-red-700/50 text-red-300";
  const errorStyle =
    "border-gray-600/50 bg-gray-800/40 hover:bg-gray-700/50 active:bg-gray-600/50 text-gray-400";

  return (
    <div className="bg-gray-950/60 border-t border-gray-700/40 px-2 py-2 flex flex-col gap-1.5">
      {WINNER_REASONS.map(({ value, labelKey }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          disabled={disabled}
          className={`${chipBase} ${winnerStyle}`}
        >
          {t(labelKey)}
        </button>
      ))}
      <div className="h-px bg-gray-700/30 my-0.5" />
      {ERROR_REASONS.map(({ value, labelKey }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          disabled={disabled}
          className={`${chipBase} ${errorStyle}`}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
