import type { Flag, OptimalFlag } from "@/domain/types";
import type { Trend as TrendResult } from "@/domain/trends";
import { Badge } from "./ui";

export function FlagBadge({ flag, optimal }: { flag: Flag; optimal: OptimalFlag | null }) {
  if (flag === "high") return <Badge tone="warn">▲ Alto</Badge>;
  if (flag === "low") return <Badge tone="warn">▼ Bajo</Badge>;
  if (optimal === "suboptimal") return <Badge tone="info">En rango, no óptimo</Badge>;
  return <Badge tone="good">✓ En rango</Badge>;
}

export function TrendBadge({ trend }: { trend: TrendResult }) {
  const arrow = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : trend.direction === "stable" ? "→" : "·";
  const label: Record<TrendResult["meaning"], string> = { improving: "mejorando", worsening: "empeorando", stable: "estable", unknown: trend.direction === "insufficient_data" ? "un solo dato" : "cambió" };
  const tone = trend.meaning === "improving" ? "good" : trend.meaning === "worsening" ? "danger" : "neutral";
  return (
    <Badge tone={tone}>
      <span aria-hidden className="mr-1">
        {arrow}
      </span>
      {label[trend.meaning]}
    </Badge>
  );
}

