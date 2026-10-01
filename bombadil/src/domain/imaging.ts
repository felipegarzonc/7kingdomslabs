/**
 * Imaging reports (MRI, ultrasound, X-ray, CT). The LLM only rewrites the
 * radiologist's report in plain language; whether it needs a prompt medical
 * visit is decided here, deterministically, from the report's own words.
 */
import { findKeyword, type TriggeredRule } from "./escalation";

export const IMAGING_MODALITIES = ["resonancia", "ecografia", "radiografia", "tomografia", "otro"] as const;
export type ImagingModality = (typeof IMAGING_MODALITIES)[number];

export const MODALITY_LABEL: Record<ImagingModality, string> = {
  resonancia: "Resonancia magnética",
  ecografia: "Ecografía",
  radiografia: "Radiografía",
  tomografia: "Tomografía",
  otro: "Estudio de imagen",
};

export const FINDING_RELEVANCE = ["normal", "leve", "a_vigilar", "importante"] as const;
export type FindingRelevance = (typeof FINDING_RELEVANCE)[number];

export const RELEVANCE_LABEL: Record<FindingRelevance, string> = {
  normal: "Normal",
  leve: "Leve",
  a_vigilar: "A vigilar",
  importante: "Importante",
};

/**
 * Words in a radiology report that warrant seeing a doctor soon. Negated
 * mentions ("sin evidencia de ruptura", "no se identifica masa") do not count.
 * PENDIENTE DE VALIDAR con médico asesor.
 */
export const IMAGING_ALARM_KEYWORDS = [
  "masa",
  "tumor",
  "neoplasia",
  "neoplasico",
  "maligno",
  "malignidad",
  "metastasis",
  "lesion ocupante",
  "nodulo sospechoso",
  "fractura",
  "aneurisma",
  "trombosis",
  "trombo",
  "embolia",
  "hemorragia",
  "ruptura completa",
  "rotura completa",
  "desgarro completo",
  "bi-rads 4",
  "bi-rads 5",
  "birads 4",
  "birads 5",
  "tirads 5",
  "ti-rads 5",
];

export const IMAGING_ALARM_RULE_ID = "imaging_alarm_finding";

export function imagingAlarm(reportText: string): TriggeredRule[] {
  const kw = findKeyword(reportText, IMAGING_ALARM_KEYWORDS);
  if (!kw) return [];
  return [
    {
      ruleId: IMAGING_ALARM_RULE_ID,
      level: "consult_soon",
      message: `Tu informe de imágenes menciona un hallazgo («${kw}») que conviene revisar con tu médico en los próximos días. Esta alerta sale de las palabras del informe, no es un diagnóstico.`,
      source: "Lista de términos de alarma en informes radiológicos. PENDIENTE DE VALIDAR con médico asesor.",
      evidence: `keyword:${kw}`,
    },
  ];
}
