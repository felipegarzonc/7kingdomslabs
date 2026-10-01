"use client";
import { useActionState } from "react";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui";
import type { ReportContent } from "@/lib/llm/report";
import { saveReport, type AdminState } from "../../actions";

export function ReportEditor({ reportId, content }: { reportId: string; content: ReportContent }) {
  const [state, action] = useActionState<AdminState, FormData>(saveReport, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="report_id" value={reportId} />
      <Field label="Titular" htmlFor="headline">
        <Input id="headline" name="headline" defaultValue={content.headline} required />
      </Field>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Prioridades (1 a 3)</legend>
        {[0, 1, 2].map((i) => {
          const p = content.priorities[i];
          return (
            <div key={i} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_12rem]">
              <Input name={`p_title_${i}`} defaultValue={p?.title ?? ""} placeholder={`Prioridad ${i + 1}${i ? " (opcional)" : ""}`} />
              <Select name={`p_kind_${i}`} defaultValue={p?.kind ?? "must"} aria-label="Tipo">
                <option value="must">Esto debes hacerlo</option>
                <option value="nice">Esto sería bueno</option>
              </Select>
              <Textarea name={`p_why_${i}`} defaultValue={p?.why ?? ""} placeholder="Por qué (ligado a los datos)" className="min-h-16 sm:col-span-2" />
              <Textarea name={`p_how_${i}`} defaultValue={p?.how ?? ""} placeholder="Cómo (acción concreta)" className="min-h-16 sm:col-span-2" />
            </div>
          );
        })}
      </fieldset>
      <Field label="Qué empeoró (una línea por hallazgo)" htmlFor="worsened">
        <Textarea id="worsened" name="worsened" defaultValue={content.worsened.join("\n")} />
      </Field>
      <Field label="Qué mejoró" htmlFor="improved">
        <Textarea id="improved" name="improved" defaultValue={content.improved.join("\n")} />
      </Field>
      <Field label="Qué está estable" htmlFor="stable">
        <Textarea id="stable" name="stable" defaultValue={content.stable.join("\n")} />
      </Field>
      <Field label="Cómo se conecta todo" htmlFor="connections">
        <Textarea id="connections" name="connections" defaultValue={content.connections} className="min-h-32" />
      </Field>
      <Field label="Qué consultar con el médico" htmlFor="see_doctor">
        <Textarea id="see_doctor" name="see_doctor" defaultValue={content.see_doctor} />
      </Field>
      <Field label="Cierre" htmlFor="closing">
        <Textarea id="closing" name="closing" defaultValue={content.closing} className="min-h-16" />
      </Field>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton variant="secondary" name="intent" value="save">
          Guardar borrador
        </SubmitButton>
        <SubmitButton name="intent" value="approve" pendingText="Aprobando…" confirm="El participante verá este informe y sus prioridades se actualizarán. ¿Aprobar?">
          Aprobar y publicar
        </SubmitButton>
      </div>
    </form>
  );
}
