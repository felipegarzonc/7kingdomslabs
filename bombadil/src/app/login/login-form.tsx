"use client";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice } from "@/components/ui";
import { sendCode, verifyCode, type LoginState } from "./actions";

export function LoginForm() {
  const [emailState, sendAction] = useActionState<LoginState, FormData>(sendCode, { step: "email" });
  const [codeState, verifyAction] = useActionState<LoginState, FormData>(verifyCode, { step: "code" });

  if (emailState.step === "code") {
    const state = { ...emailState, ...codeState, email: emailState.email };
    return (
      <form action={verifyAction} className="flex flex-col gap-4">
        {state.message ? <Notice tone="good">{state.message}</Notice> : null}
        <input type="hidden" name="email" value={state.email} />
        <Field label="Código de 6 dígitos" htmlFor="code">
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={8} required autoFocus />
        </Field>
        {codeState.error ? <Notice tone="danger">{codeState.error}</Notice> : null}
        <SubmitButton pendingText="Verificando…">Entrar</SubmitButton>
        <p className="text-xs text-muted">También puedes abrir el enlace del correo en este dispositivo.</p>
      </form>
    );
  }

  return (
    <form action={sendAction} className="flex flex-col gap-4">
      <Field label="Correo electrónico" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus placeholder="tu@correo.com" />
      </Field>
      {emailState.error ? <Notice tone="danger">{emailState.error}</Notice> : null}
      <SubmitButton pendingText="Enviando…">Recibir código</SubmitButton>
    </form>
  );
}
