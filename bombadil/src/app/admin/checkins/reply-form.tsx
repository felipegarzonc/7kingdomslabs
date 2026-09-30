"use client";
import { useActionState } from "react";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { Textarea } from "@/components/ui";
import { sendReply, type AdminState } from "../actions";

export function ReplyForm({ checkinId, draft }: { checkinId: string; draft: string }) {
  const [state, action] = useActionState<AdminState, FormData>(sendReply, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="checkin_id" value={checkinId} />
      <Textarea name="final_text" defaultValue={draft} className="min-h-32" aria-label="Respuesta" />
      <FormMessage state={state} />
      <SubmitButton pendingText="Enviando…">Enviar al participante</SubmitButton>
    </form>
  );
}
