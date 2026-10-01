"use client";
import { useActionState } from "react";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select } from "@/components/ui";
import { PILLAR_LABEL, PILLARS } from "@/domain/habits";
import { createCustomHabit, regeneratePlan, type HabitState } from "../habitos/actions";

export function RegeneratePlanForm() {
  const [state, action] = useActionState<HabitState>(regeneratePlan, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <SubmitButton variant="secondary" pendingText="Mirando tus datos… (unos 30 segundos)">
        Sugerirme un siguiente paso
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function CustomHabitForm() {
  const [state, action] = useActionState<HabitState, FormData>(createCustomHabit, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Hábito" htmlFor="title" hint="Concreto y pequeño. Ej.: «Tomar un vaso de agua al despertar».">
        <Input id="title" name="title" required maxLength={140} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Área" htmlFor="pillar">
          <Select id="pillar" name="pillar" defaultValue="movimiento">
            {PILLARS.map((p) => (
              <option key={p} value={p}>
                {PILLAR_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Días por semana" htmlFor="target_per_week">
          <Select id="target_per_week" name="target_per_week" defaultValue="5">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="¿Después de qué lo harás?" htmlFor="anchor" hint="Opcional. Ej.: «Después de servirme el café».">
        <Input id="anchor" name="anchor" maxLength={140} />
      </Field>
      <Field label="Versión mínima para un día difícil" htmlFor="tiny" hint="Opcional. Ej.: «Un sorbo de agua».">
        <Input id="tiny" name="tiny" maxLength={140} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Agregar hábito</SubmitButton>
    </form>
  );
}
