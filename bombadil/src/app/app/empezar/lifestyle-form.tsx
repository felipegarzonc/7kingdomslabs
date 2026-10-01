"use client";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { Field, Textarea } from "@/components/ui";
import { PILLAR_LABEL, PILLARS, type Pillar } from "@/domain/habits";
import { LIFESTYLE_QUESTIONS, type Lifestyle } from "@/domain/lifestyle";
import { saveLifestyleAndPlan, type HabitState } from "../habitos/actions";

const chip =
  "flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-center text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-accent";

export function LifestyleForm({ initial, goal }: { initial: Partial<Lifestyle> | null; goal: string | null }) {
  const [state, action] = useActionState<HabitState, FormData>(saveLifestyleAndPlan, null);
  const [focus, setFocus] = useState<Pillar[]>(initial?.focus ?? []);
  const toggle = (p: Pillar) => setFocus((f) => (f.includes(p) ? f.filter((x) => x !== p) : f.length < 3 ? [...f, p] : f));

  return (
    <form action={action} className="flex flex-col gap-6">
      <Field label="¿Qué quieres lograr con tu salud en los próximos años?" htmlFor="personal_goal" hint="En tus palabras. Ej.: «Llegar a los 80 jugando fútbol con mis nietos».">
        <Textarea id="personal_goal" name="personal_goal" defaultValue={goal ?? ""} maxLength={1000} />
      </Field>

      {LIFESTYLE_QUESTIONS.map((q) => (
        <fieldset key={q.key}>
          <legend className="mb-2 font-medium">{q.label}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {q.options.map((o) => (
              <label key={o.value} className="cursor-pointer">
                <input type="radio" name={q.key} value={o.value} required defaultChecked={initial?.[q.key] === o.value} className="peer sr-only" />
                <span className={chip}>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset>
        <legend className="mb-1 font-medium">¿En qué quieres enfocarte primero?</legend>
        <p className="mb-2 text-xs text-muted">Elige hasta 3.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PILLARS.map((p) => (
            <label key={p} className="cursor-pointer">
              <input type="checkbox" name="focus" value={p} checked={focus.includes(p)} onChange={() => toggle(p)} className="peer sr-only" />
              <span className={chip}>{PILLAR_LABEL[p]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="¿Algo que debamos tener en cuenta?" htmlFor="constraints" hint="Opcional. Lesiones, horarios, lo que te gusta o no. Ej.: «Me duele la rodilla izquierda, trabajo hasta las 7 p. m.».">
        <Textarea id="constraints" name="constraints" defaultValue={initial?.constraints ?? ""} maxLength={500} />
      </Field>

      <FormMessage state={state} />
      <SubmitButton pendingText="Armando tu plan… (unos 30 segundos)">Crear mi plan de hábitos</SubmitButton>
    </form>
  );
}
