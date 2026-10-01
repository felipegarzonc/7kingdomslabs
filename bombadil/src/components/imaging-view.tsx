import { MODALITY_LABEL, RELEVANCE_LABEL, type FindingRelevance } from "@/domain/imaging";
import type { StoredImaging } from "@/lib/llm/imaging";
import { Badge, Card } from "./ui";

const RELEVANCE_TONE: Record<FindingRelevance, "good" | "neutral" | "warn" | "danger"> = {
  normal: "good",
  leve: "neutral",
  a_vigilar: "warn",
  importante: "danger",
};

export function imagingTitle(imaging: Pick<StoredImaging, "modality" | "body_region">): string {
  const modality = MODALITY_LABEL[imaging.modality ?? "otro"];
  return imaging.body_region ? `${modality} · ${imaging.body_region}` : modality;
}

/** Plain-language reading of a radiology report, as generated (no operator review). */
export function ImagingView({ imaging }: { imaging: StoredImaging }) {
  return (
    <div className="flex flex-col gap-4">
      <Card title="En pocas palabras">
        <p className="text-sm leading-relaxed">{imaging.summary}</p>
        {imaging.impression ? (
          <p className="mt-3 text-sm leading-relaxed">
            <span className="font-medium">Conclusión del radiólogo: </span>
            {imaging.impression}
          </p>
        ) : null}
      </Card>
      {imaging.findings.length ? (
        <Card title="Hallazgos">
          <ul className="divide-y divide-border">
            {imaging.findings.map((f, i) => (
              <li key={i} className="flex flex-col gap-1 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{f.finding}</span>
                  <Badge tone={RELEVANCE_TONE[f.relevance]}>{RELEVANCE_LABEL[f.relevance]}</Badge>
                </div>
                <p className="text-muted">{f.explanation}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {imaging.questions_for_doctor.length ? (
        <Card title="Para tu próxima cita">
          <ul className="list-disc pl-5 text-sm leading-relaxed">
            {imaging.questions_for_doctor.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      <p className="text-xs text-muted">
        Explicación automática del texto del informe, no de las imágenes. No es un diagnóstico ni reemplaza la lectura de tu médico. Generado con {imaging.prompt_version}.
      </p>
    </div>
  );
}
