"use client";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Field, Input, inputClass } from "@/components/ui";
import { saveReview, type AdminState } from "../../actions";

export interface ReviewRowInput {
  printed: string;
  code: string | null;
  value: number | null;
  unit: string;
  low: number | null;
  high: number | null;
  include: boolean;
  qualifier?: string | null;
}

export function ReviewForm({
  documentId,
  rows: initial,
  sampledOn,
  labName,
  biomarkers,
}: {
  documentId: string;
  rows: ReviewRowInput[];
  sampledOn: string | null;
  labName: string | null;
  biomarkers: Array<{ code: string; name: string; unit: string }>;
}) {
  const [state, action] = useActionState<AdminState, FormData>(saveReview, null);
  const [rows, setRows] = useState(initial);
  const cell = "border-t border-border px-1.5 py-1.5 align-top";
  const small = `${inputClass} min-h-9 px-2 py-1 text-sm`;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="document_id" value={documentId} />
      <input type="hidden" name="row_count" value={rows.length} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha de toma" htmlFor="sampled_on">
          <Input id="sampled_on" name="sampled_on" type="date" defaultValue={sampledOn ?? ""} required />
        </Field>
        <Field label="Laboratorio" htmlFor="lab_name">
          <Input id="lab_name" name="lab_name" defaultValue={labName ?? ""} />
        </Field>
      </div>
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase">
              <th className="px-1.5 py-1">✓</th>
              <th className="px-1.5 py-1">En el informe</th>
              <th className="px-1.5 py-1">Biomarcador</th>
              <th className="px-1.5 py-1">Valor</th>
              <th className="px-1.5 py-1">Unidad</th>
              <th className="px-1.5 py-1">Ref. mín</th>
              <th className="px-1.5 py-1">Ref. máx</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.code ? "" : "opacity-70"}>
                <td className={cell}>
                  <input type="checkbox" name={`include_${i}`} defaultChecked={r.include} className="mt-2 size-4 accent-[var(--accent)]" aria-label={`Incluir fila ${i + 1}`} />
                </td>
                <td className={`${cell} max-w-40 text-xs`}>
                  {r.printed || <span className="text-muted">manual</span>}
                  {r.qualifier ? <span className="ml-1 font-semibold text-warn">{r.qualifier}</span> : null}
                </td>
                <td className={cell}>
                  <select name={`code_${i}`} defaultValue={r.code ?? ""} className={small} aria-label="Biomarcador">
                    <option value="">— no incluido en catálogo —</option>
                    {biomarkers.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.unit})
                      </option>
                    ))}
                  </select>
                </td>
                <td className={cell}>
                  <input name={`value_${i}`} defaultValue={r.value ?? ""} inputMode="decimal" className={`${small} w-24`} aria-label="Valor" />
                </td>
                <td className={cell}>
                  <input name={`unit_${i}`} defaultValue={r.unit} className={`${small} w-28`} aria-label="Unidad" />
                </td>
                <td className={cell}>
                  <input name={`low_${i}`} defaultValue={r.low ?? ""} inputMode="decimal" className={`${small} w-20`} aria-label="Referencia mínima" />
                </td>
                <td className={cell}>
                  <input name={`high_${i}`} defaultValue={r.high ?? ""} inputMode="decimal" className={`${small} w-20`} aria-label="Referencia máxima" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className={buttonClass("ghost", "self-start")} onClick={() => setRows((rs) => [...rs, { printed: "", code: null, value: null, unit: "", low: null, high: null, include: true }])}>
        + Agregar fila manual
      </button>
      <FormMessage state={state} />
      <SubmitButton pendingText="Guardando…">Confirmar revisión y publicar en la línea de tiempo</SubmitButton>
    </form>
  );
}
