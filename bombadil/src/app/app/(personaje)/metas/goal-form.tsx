"use client";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { createGoal, type ActionState } from "@/app/app/actions";

export function GoalForm({ metrics }: { metrics: Array<{ value: string; label: string; unit: string; latest: number | null }> }) {
  const [state, action] = useActionState<ActionState, FormData>(createGoal, null);
  const [metric, setMetric] = useState(metrics[0]?.value ?? "");
  const m = metrics.find((x) => x.value === metric);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Métrica" htmlFor="metric">
        <Select id="metric" name="metric" value={metric} onChange={(e) => setMetric(e.target.value)}>
          {metrics.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Línea base (${m?.unit ?? ""})`} htmlFor="baseline" hint={m?.latest !== null && m?.latest !== undefined ? "Tu último valor registrado." : "Tu valor actual."}>
          <Input key={metric} id="baseline" name="baseline" inputMode="decimal" required defaultValue={m?.latest ?? ""} />
        </Field>
        <Field label={`Meta (${m?.unit ?? ""})`} htmlFor="target">
          <Input id="target" name="target" inputMode="decimal" required />
        </Field>
      </div>
      <Field label="Horizonte" htmlFor="horizon_months">
        <Select id="horizon_months" name="horizon_months" defaultValue="3">
          <option value="3">3 meses</option>
          <option value="6">6 meses</option>
          <option value="12">12 meses</option>
        </Select>
      </Field>
      <Field label="Nota (opcional)" htmlFor="notes">
        <Textarea id="notes" name="notes" maxLength={300} className="min-h-16" placeholder="Ej.: caminar 30 min después del almuerzo" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton>Crear meta</SubmitButton>
    </form>
  );
}
