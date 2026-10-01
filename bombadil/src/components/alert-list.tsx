import { LEVEL_LABEL } from "@/domain/escalation";
import type { EscalationLevel } from "@/domain/types";
import { Notice } from "./ui";

const TONE = { urgency: "danger", consult_soon: "warn", next_visit: "info" } as const;

export function AlertNotices({ alerts }: { alerts: Array<{ level: EscalationLevel; message: string }> }) {
  if (!alerts.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a, i) => (
        <Notice key={i} tone={TONE[a.level]} title={a.level === "urgency" ? "⚠️ Atención inmediata" : LEVEL_LABEL[a.level]}>
          {a.message}
          {a.level === "urgency" ? <p className="mt-2 font-semibold">Emergencias en Colombia: línea 123.</p> : null}
        </Notice>
      ))}
    </div>
  );
}
