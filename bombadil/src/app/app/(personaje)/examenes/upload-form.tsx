"use client";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form-state";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui";
import { uploadLab, type ActionState } from "@/app/app/actions";

export function UploadForm() {
  const [state, action] = useActionState<ActionState, FormData>(uploadLab, null);
  const [key, setKey] = useState(0);
  return (
    <form
      key={key}
      action={async (fd) => {
        await action(fd);
        setKey((k) => k + 1);
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Archivo PDF del laboratorio" htmlFor="file" hint="PDF original del laboratorio o del informe de imágenes (no foto). Máximo 15 MB.">
        <Input id="file" name="file" type="file" accept="application/pdf" required className="file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Laboratorio (opcional)" htmlFor="lab_name">
          <Input id="lab_name" name="lab_name" placeholder="Sura, Colcan…" />
        </Field>
        <Field label="Fecha de toma (opcional)" htmlFor="sampled_on">
          <Input id="sampled_on" name="sampled_on" type="date" max={new Date().toISOString().slice(0, 10)} />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Subiendo…">Subir examen</SubmitButton>
    </form>
  );
}
