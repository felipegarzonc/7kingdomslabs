"use client";
import { useActionState, useState } from "react";
import { AlertNotices } from "@/components/alert-list";
import { FormMessage } from "@/components/form-state";
import { nowLocalBogota } from "@/components/format";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select } from "@/components/ui";
import { addMeasurement, type ActionState } from "@/app/app/actions";

const TYPES = [
  { value: "bp", label: "Presión arterial", unit: "mmHg" },
  { value: "weight", label: "Peso", unit: "kg" },
  { value: "waist", label: "Cintura", unit: "cm" },
  { value: "resting_hr", label: "Frecuencia cardiaca en reposo", unit: "lpm" },
  { value: "sleep_hours", label: "Horas de sueño (noche)", unit: "h" },
  { value: "exercise_minutes", label: "Minutos de ejercicio (día)", unit: "min" },
  {
    value: "grip_strength",
    label: "Fuerza de agarre",
    unit: "kg",
    hint: "Con un dinamómetro de mano: de pie, brazo junto al cuerpo, aprieta 3 veces con tu mano más fuerte y anota el mejor intento.",
  },
  {
    value: "vo2max",
    label: "VO2max estimado",
    unit: "ml/kg/min",
    hint: "El que calcula tu reloj o app (Garmin, Apple, Polar…) o una prueba de esfuerzo. Anótalo una vez al mes.",
  },
];

export function MeasurementForm() {
  const [state, action] = useActionState<ActionState, FormData>(addMeasurement, null);
  const [type, setType] = useState("bp");
  const [key, setKey] = useState(0);
  const selected = TYPES.find((t) => t.value === type);
  const unit = selected?.unit;

  return (
    <form
      key={key}
      action={async (fd) => {
        await action(fd);
        setKey((k) => k + 1);
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Qué mediste" htmlFor="type">
          <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha y hora" htmlFor="measured_at">
          <Input id="measured_at" name="measured_at" type="datetime-local" defaultValue={nowLocalBogota()} />
        </Field>
      </div>
      {type === "bp" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sistólica (alta)" htmlFor="systolic">
              <Input id="systolic" name="systolic" inputMode="numeric" required placeholder="120" />
            </Field>
            <Field label="Diastólica (baja)" htmlFor="diastolic">
              <Input id="diastolic" name="diastolic" inputMode="numeric" required placeholder="80" />
            </Field>
            <Field label="Brazo" htmlFor="arm">
              <Select id="arm" name="arm" defaultValue="left">
                <option value="left">Izquierdo</option>
                <option value="right">Derecho</option>
              </Select>
            </Field>
            <Field label="Momento" htmlFor="period">
              <Select id="period" name="period" defaultValue="day">
                <option value="day">Día</option>
                <option value="night">Noche (durmiendo / MAPA)</option>
              </Select>
            </Field>
          </div>
          <p className="text-xs text-muted">Mide sentado, tras 5 minutos de reposo, con la espalda apoyada y el brazo a la altura del corazón.</p>
        </>
      ) : (
        <Field label={`Valor (${unit})`} htmlFor="value" hint={selected?.hint}>
          <Input id="value" name="value" inputMode="decimal" required />
        </Field>
      )}
      {state?.alerts?.length ? <AlertNotices alerts={state.alerts} /> : null}
      <FormMessage state={state} />
      <SubmitButton>Guardar medición</SubmitButton>
    </form>
  );
}
