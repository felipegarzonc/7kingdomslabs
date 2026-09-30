"use client";
import { useActionState } from "react";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui";
import { inviteParticipant, type AdminState } from "../../actions";

export function InviteForm() {
  const [state, action] = useActionState<AdminState, FormData>(inviteParticipant, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Correo" htmlFor="email">
        <Input id="email" name="email" type="email" required />
      </Field>
      <Field label="Nombre (solo visible para ti)" htmlFor="display_name" hint="Nunca se envía al modelo de lenguaje.">
        <Input id="display_name" name="display_name" />
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="send_email" value="yes" defaultChecked className="size-5 accent-[var(--accent)]" />
        Enviarle ahora el correo con el código de acceso
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Invitando…">Invitar</SubmitButton>
    </form>
  );
}
