"use client";
import { useActionState, useState } from "react";
import { AlertNotices } from "@/components/alert-list";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Textarea } from "@/components/ui";
import { SYMPTOM_LABEL, SYMPTOMS } from "@/domain/escalation";
import { submitCheckin, type ActionState } from "../actions";

const ADHERENCE = [
  { value: "done", label: "Sí" },
  { value: "partial", label: "A medias" },
  { value: "no", label: "No" },
];

export function CheckinForm({ priorities, week }: { priorities: string[]; week: number }) {
  const [state, action] = useActionState<ActionState, FormData>(submitCheckin, null);
  const [startedAt] = useState(() => Date.now());

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-3">
        <AlertNotices alerts={state.alerts ?? []} />
        <FormMessage state={state} />
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="started_at" value={startedAt} />
      {priorities.length ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 font-semibold">¿Cumpliste tus prioridades esta semana?</legend>
          {priorities.map((p, i) => (
            <div key={p} className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm">{p}</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={p}>
                {ADHERENCE.map((a) => (
                  <label key={a.value} className="cursor-pointer">
                    <input type="radio" name={`adherence_${i}`} value={a.value} required className="peer sr-only" />
                    <span className="flex min-h-11 items-center justify-center rounded-lg border border-border text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                      {a.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="mb-1 font-semibold">Mediciones de la semana</legend>
        <p className="mb-3 text-xs text-muted">Opcionales. Solo lo que hayas medido.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Peso (kg)" htmlFor="weight">
            <Input id="weight" name="weight" inputMode="decimal" />
          </Field>
          <Field label="Cintura (cm)" htmlFor="waist">
            <Input id="waist" name="waist" inputMode="decimal" />
          </Field>
          <Field label="FC en reposo (lpm)" htmlFor="resting_hr">
            <Input id="resting_hr" name="resting_hr" inputMode="numeric" />
          </Field>
          <Field label="Presión sistólica" htmlFor="systolic">
            <Input id="systolic" name="systolic" inputMode="numeric" placeholder="120" />
          </Field>
          <Field label="Presión diastólica" htmlFor="diastolic">
            <Input id="diastolic" name="diastolic" inputMode="numeric" placeholder="80" />
          </Field>
          <Field label="Sueño promedio (h)" htmlFor="sleep_hours">
            <Input id="sleep_hours" name="sleep_hours" inputMode="decimal" />
          </Field>
          <Field label="Ejercicio total (min)" htmlFor="exercise_minutes">
            <Input id="exercise_minutes" name="exercise_minutes" inputMode="numeric" />
          </Field>
          <Field label="Tragos de alcohol" htmlFor="alcohol_drinks" hint="1 trago = 1 cerveza, 1 copa de vino o 1 shot. 0 si no tomaste.">
            <Input id="alcohol_drinks" name="alcohol_drinks" inputMode="numeric" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">¿Tuviste alguno de estos síntomas?</legend>
        {SYMPTOMS.map((s) => (
          <label key={s} className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="symptoms" value={s} className="mt-0.5 size-5 accent-[var(--danger)]" />
            {SYMPTOM_LABEL[s]}
          </label>
        ))}
      </fieldset>

      <Field label="¿Qué fue lo más difícil esta semana?" htmlFor="free_text">
        <Textarea id="free_text" name="free_text" maxLength={2000} placeholder="Opcional" />
      </Field>

      <FormMessage state={state} />
      <SubmitButton pendingText="Enviando…">Enviar check-in de la semana {week}</SubmitButton>
    </form>
  );
}
