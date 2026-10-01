"use client";
import { useActionState } from "react";
import { FormMessage } from "@/components/form-state";
import { SmokingSelect } from "@/components/smoking-select";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Textarea } from "@/components/ui";
import type { SmokingStatus } from "@/domain/types";
import { deleteMyAccount, updateProfile, type ActionState } from "../actions";

export function ProfileForm({ height, goal, smoking }: { height: number | null; goal: string | null; smoking: SmokingStatus | null }) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfile, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Estatura (cm)" htmlFor="height_cm">
        <Input id="height_cm" name="height_cm" inputMode="decimal" defaultValue={height ?? ""} required />
      </Field>
      <SmokingSelect defaultValue={smoking} />
      <Field label="Tu objetivo" htmlFor="personal_goal">
        <Textarea id="personal_goal" name="personal_goal" defaultValue={goal ?? ""} maxLength={1000} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Guardar</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState<ActionState, FormData>(deleteMyAccount, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Escribe ELIMINAR para confirmar" htmlFor="confirm">
        <Input id="confirm" name="confirm" autoComplete="off" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="danger" pendingText="Eliminando…" confirm="Esto borra tu cuenta, tus exámenes y todos tus datos de forma permanente. ¿Continuar?">
        Eliminar mi cuenta y todos mis datos
      </SubmitButton>
    </form>
  );
}
