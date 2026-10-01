"use client";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { cx, Field, Input, Select, Textarea } from "@/components/ui";
import { PILLAR_LABEL, PILLARS, type Pillar } from "@/domain/habits";
import { LIFESTYLE_QUESTIONS, type Lifestyle } from "@/domain/lifestyle";
import { OWN_HABITS } from "@/domain/own-habits";
import { saveLifestyleAndPlan, type HabitState } from "../habitos/actions";

const chip =
  "flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-center text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-accent";

export interface OwnPrefill {
  days: number;
  anchor: string;
  /** Why it is pre-checked when it comes from the watch. */
  why?: string;
}

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/** "¿Qué haces ya por tu salud?": one tap per habit, then how often and when. */
function OwnHabitsFieldset({ prefill }: { prefill: Record<string, OwnPrefill> }) {
  const [on, setOn] = useState<string[]>(Object.keys(prefill));
  const toggle = (k: string) => setOn((xs) => (xs.includes(k) ? xs.filter((x) => x !== k) : [...xs, k]));
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-lg font-black">¿Qué haces ya por tu salud?</legend>
      <p className="-mt-1 text-sm text-muted">Marca lo que ya es parte de tu semana, aunque no sea perfecto. Lo sumamos a tu racha desde hoy. Si nada aplica, sigue adelante.</p>
      <ul className="flex flex-col gap-2">
        {OWN_HABITS.map((o) => {
          const checked = on.includes(o.key);
          const pre = prefill[o.key];
          return (
            <li key={o.key} className={cx("rounded-2xl border-2 p-3", checked ? "border-accent bg-accent-soft/40" : "border-border")}>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" name={`own_${o.key}`} checked={checked} onChange={() => toggle(o.key)} className="mt-0.5 size-5 accent-[var(--accent)]" />
                <span className="min-w-0 flex-1">
                  <span className="font-bold">{o.label}</span>
                  {pre?.why ? <span className="block text-xs font-semibold text-accent">Tu reloj lo muestra: {pre.why}</span> : null}
                </span>
              </label>
              {checked ? (
                <div className="mt-3 grid grid-cols-1 gap-2 pl-8 sm:grid-cols-[10rem_1fr]">
                  <Field label="Días por semana" htmlFor={`own_${o.key}_days`}>
                    <Select id={`own_${o.key}_days`} name={`own_${o.key}_days`} defaultValue={String(pre?.days ?? o.defaultDays)}>
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="¿Cuándo? (opcional)" htmlFor={`own_${o.key}_anchor`}>
                    <Input id={`own_${o.key}_anchor`} name={`own_${o.key}_anchor`} defaultValue={pre?.anchor ?? ""} maxLength={140} placeholder="Ej.: antes del trabajo" />
                  </Field>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <details className="rounded-2xl border-2 border-dashed border-border p-3">
        <summary className="cursor-pointer font-bold">Hago otra cosa que no está en la lista</summary>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="¿Qué haces?" htmlFor="other_title">
            <Input id="other_title" name="other_title" maxLength={140} placeholder="Ej.: bailo salsa los sábados" />
          </Field>
          <Field label="Área" htmlFor="other_pillar">
            <Select id="other_pillar" name="other_pillar" defaultValue="movimiento">
              {PILLARS.map((p) => (
                <option key={p} value={p}>
                  {PILLAR_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Días por semana" htmlFor="other_days">
            <Select id="other_days" name="other_days" defaultValue="2">
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="¿Cuándo? (opcional)" htmlFor="other_anchor">
            <Input id="other_anchor" name="other_anchor" maxLength={140} />
          </Field>
        </div>
      </details>
    </fieldset>
  );
}

export function LifestyleForm({ initial, goal, prefill = {} }: { initial: Partial<Lifestyle> | null; goal: string | null; prefill?: Record<string, OwnPrefill> }) {
  const [state, action] = useActionState<HabitState, FormData>(saveLifestyleAndPlan, null);
  const [focus, setFocus] = useState<Pillar[]>(initial?.focus ?? []);
  const toggle = (p: Pillar) => setFocus((f) => (f.includes(p) ? f.filter((x) => x !== p) : f.length < 3 ? [...f, p] : f));

  return (
    <form action={action} className="flex flex-col gap-6">
      <OwnHabitsFieldset prefill={prefill} />

      <p className="border-t-2 border-border pt-5 text-lg font-black">Ahora, cómo vives</p>

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
        <legend className="mb-1 font-medium">Si hiciéramos una sugerencia, ¿en qué área te gustaría?</legend>
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
      <SubmitButton pendingText="Mirando lo que ya haces… (unos 30 segundos)">Guardar y ver sugerencias</SubmitButton>
    </form>
  );
}
