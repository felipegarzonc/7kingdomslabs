"use client";
import { useActionState } from "react";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import { submitFeedback, type ActionState } from "./actions";

export function FeedbackCard() {
  const [state, action] = useActionState<ActionState, FormData>(submitFeedback, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <Card title="¿Cómo te ha servido el piloto?">
      <form action={action} className="flex flex-col gap-4">
        <Field label="Si Bombadil continuara después del piloto, ¿seguirías usándolo?" htmlFor="would_continue">
          <Select id="would_continue" name="would_continue" required defaultValue="">
            <option value="" disabled>
              Elige…
            </option>
            <option value="yes">Sí</option>
            <option value="maybe">Tal vez</option>
            <option value="no">No</option>
          </Select>
        </Field>
        <Field label="¿Cuánto pagarías al mes por continuar? (COP, opcional)" htmlFor="willingness_to_pay_cop" hint="Di la cifra que te parezca justa, sin pensar en lo que cuestan otros servicios.">
          <Input id="willingness_to_pay_cop" name="willingness_to_pay_cop" inputMode="numeric" placeholder="Ej.: 40000" />
        </Field>
        <Field label="¿Qué cambiarías?" htmlFor="comments">
          <Textarea id="comments" name="comments" maxLength={2000} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton>Enviar</SubmitButton>
      </form>
    </Card>
  );
}
