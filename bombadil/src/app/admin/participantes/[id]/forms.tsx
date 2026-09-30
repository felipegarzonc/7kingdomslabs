"use client";
import { useActionState } from "react";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui";
import {
  createGoalForParticipant,
  deleteParticipant,
  generateReportDraft,
  recordFeedback,
  updatePriorities,
  uploadLabForParticipant,
  type AdminState,
} from "../../actions";

export function PrioritiesForm({ participantId, priorities }: { participantId: string; priorities: string[] }) {
  const [state, action] = useActionState<AdminState, FormData>(updatePriorities, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="participant_id" value={participantId} />
      {[0, 1, 2].map((i) => (
        <Input key={i} name={`priority_${i}`} defaultValue={priorities[i] ?? ""} placeholder={`Prioridad ${i + 1}${i ? " (opcional)" : ""}`} maxLength={200} />
      ))}
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Guardar prioridades</SubmitButton>
    </form>
  );
}

export function GenerateReportForm({ participantId }: { participantId: string }) {
  const [state, action] = useActionState<AdminState, FormData>(generateReportDraft, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="participant_id" value={participantId} />
      <FormMessage state={state} />
      <SubmitButton pendingText="Generando (puede tardar ~1 min)…">Generar borrador de informe</SubmitButton>
    </form>
  );
}

export function AdminUploadForm({ participantId }: { participantId: string }) {
  const [state, action] = useActionState<AdminState, FormData>(uploadLabForParticipant, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="participant_id" value={participantId} />
      <Input name="file" type="file" accept="application/pdf" required />
      <Input name="lab_name" placeholder="Laboratorio (opcional)" />
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText="Subiendo…">
        Subir PDF
      </SubmitButton>
    </form>
  );
}

export function AdminGoalForm({ participantId, metrics }: { participantId: string; metrics: Array<{ value: string; label: string }> }) {
  const [state, action] = useActionState<AdminState, FormData>(createGoalForParticipant, null);
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <input type="hidden" name="participant_id" value={participantId} />
      <div className="col-span-2">
        <Select name="metric" aria-label="Métrica">
          {metrics.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>
      <Input name="baseline" inputMode="decimal" placeholder="Línea base" required />
      <Input name="target" inputMode="decimal" placeholder="Meta" required />
      <Select name="horizon_months" defaultValue="3" aria-label="Horizonte">
        <option value="3">3 meses</option>
        <option value="6">6 meses</option>
        <option value="12">12 meses</option>
      </Select>
      <Input name="start_date" type="date" aria-label="Inicio (por defecto hoy)" />
      <div className="col-span-2 flex flex-col gap-2">
        <FormMessage state={state} />
        <SubmitButton variant="secondary">Crear meta</SubmitButton>
      </div>
    </form>
  );
}

export function FeedbackForm({ participantId, week }: { participantId: string; week: number | null }) {
  const [state, action] = useActionState<AdminState, FormData>(recordFeedback, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="participant_id" value={participantId} />
      <input type="hidden" name="week" value={week ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pagaría (COP/mes)" htmlFor="wtp">
          <Input id="wtp" name="willingness_to_pay_cop" inputMode="numeric" />
        </Field>
        <Field label="¿Continuaría?" htmlFor="cont">
          <Select id="cont" name="would_continue" defaultValue="">
            <option value="">—</option>
            <option value="yes">Sí</option>
            <option value="maybe">Tal vez</option>
            <option value="no">No</option>
          </Select>
        </Field>
      </div>
      <Textarea name="comments" placeholder="Notas de la conversación" className="min-h-16" />
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Registrar</SubmitButton>
    </form>
  );
}

export function DeleteParticipantForm({ participantId }: { participantId: string }) {
  const [state, action] = useActionState<AdminState, FormData>(deleteParticipant, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="participant_id" value={participantId} />
      <Input name="confirm" placeholder="Escribe ELIMINAR" autoComplete="off" />
      <FormMessage state={state} />
      <SubmitButton variant="danger" confirm="Borra la cuenta, los PDFs y todos los datos de forma permanente. ¿Continuar?">
        Eliminar participante y todos sus datos
      </SubmitButton>
    </form>
  );
}
