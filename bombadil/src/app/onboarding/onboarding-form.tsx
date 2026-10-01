"use client";
import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/form-state";
import { SmokingSelect } from "@/components/smoking-select";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select } from "@/components/ui";
import { completeOnboarding } from "./actions";

export function OnboardingForm({ consent }: { consent: React.ReactNode }) {
  const [state, action] = useActionState<FormState, FormData>(completeOnboarding, null);
  return (
    <form action={action} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">1. Tu autorización</h2>
        <p className="text-sm text-muted">
          Tratamos tus datos de salud solo para darte tu plan. Ocultamos tu nombre antes de usar inteligencia artificial, puedes descargar o borrar todo cuando quieras, y Bombadil no reemplaza a tu médico.
        </p>
        <details className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
          <summary className="cursor-pointer font-medium">Leer el consentimiento completo</summary>
          <div className="mt-3 max-h-80 overflow-y-auto" tabIndex={0} aria-label="Texto del consentimiento">
            {consent}
          </div>
        </details>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consent" value="yes" required className="mt-1 size-5 accent-[var(--accent)]" />
          <span>He leído el consentimiento y autorizo el tratamiento de mis datos personales y de salud para las finalidades descritas.</span>
        </label>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold">2. Dos datos básicos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de nacimiento" htmlFor="birth_date">
            <Input id="birth_date" name="birth_date" type="date" required max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Sexo biológico" htmlFor="sex" hint="Define rangos de referencia.">
            <Select id="sex" name="sex" required defaultValue="">
              <option value="" disabled>
                Elige…
              </option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
            </Select>
          </Field>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Agregar estatura y tabaco (opcional, mejora el análisis)</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Estatura (cm)" htmlFor="height_cm">
              <Input id="height_cm" name="height_cm" type="number" inputMode="decimal" min={100} max={250} step="0.5" />
            </Field>
            <SmokingSelect optional />
          </div>
        </details>
      </section>
      <FormMessage state={state} />
      <SubmitButton pendingText="Guardando…">Empezar</SubmitButton>
    </form>
  );
}
