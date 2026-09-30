import { GOAL_STATUS_LABEL } from "@/domain/goals";
import type { GoalStatus } from "@/domain/types";
import { Badge } from "./ui";

const TONE = { achieved: "good", on_track: "good", stalled: "warn", regressing: "danger", no_data: "neutral" } as const;
const ICON = { achieved: "✓", on_track: "↗", stalled: "→", regressing: "↘", no_data: "·" } as const;

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return (
    <Badge tone={TONE[status]}>
      <span aria-hidden className="mr-1">
        {ICON[status]}
      </span>
      {GOAL_STATUS_LABEL[status]}
    </Badge>
  );
}

export function ProgressBar({ progress, expected }: { progress: number | null; expected: number }) {
  const p = Math.max(0, Math.min(1, progress ?? 0));
  return (
    <div className="relative h-2 w-full rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-2 rounded-full bg-accent" style={{ width: `${p * 100}%` }} />
      <div className="absolute top-[-3px] h-3.5 w-0.5 rounded bg-muted" style={{ left: `${expected * 100}%` }} title="Dónde deberías ir según el tiempo transcurrido" />
    </div>
  );
}
