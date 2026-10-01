/**
 * Biomarker catalog — the single source of truth.
 * `supabase/seed.sql` is generated from this file (`npm run gen:seed`).
 *
 * Reference ranges are generic adult ranges; when the lab report includes its
 * own reference range we store it too and prefer it for flagging.
 *
 * "Optimal" ranges are PENDIENTE DE VALIDAR con médico asesor. Each carries its
 * source; where no strong source exists the source says so explicitly.
 */
import type { BetterWhen, SexedRange } from "./types";
import type { UnitConversion } from "./units";

export type BiomarkerCategory =
  | "glucose"
  | "lipids"
  | "liver"
  | "kidney"
  | "thyroid"
  | "vitamins"
  | "blood_count"
  | "inflammation";

export interface Biomarker {
  code: string;
  name: string;
  category: BiomarkerCategory;
  synonyms: string[];
  /** Human-readable canonical unit. */
  unit: string;
  /** Conversions from other units into the canonical unit. Canonical unit itself maps with factor 1. */
  conversions: UnitConversion[];
  reference: SexedRange;
  optimal?: SexedRange;
  betterWhen: BetterWhen;
  /** Minimum change considered clinically meaningful (canonical units), used for trend detection. */
  meaningfulChange: number;
  source: string;
  notes?: string;
  /** Key studies or guidelines behind the ranges, shown with links in the timeline. Not stored in the DB. */
  evidence?: Evidence[];
}

export interface Evidence {
  label: string;
  url: string;
}

/** Shared references (verified Oct 2026; see the "Longevidad: base de evidencia" research doc). */
const EV = {
  easLdl: { label: "Ference et al., Eur Heart J 2017 — consenso EAS: el LDL causa enfermedad cardiovascular", url: "https://eprints.gla.ac.uk/140708" },
  escLipids: { label: "Guías ESC/EAS 2019 de dislipidemias (metas de LDL y ApoB)", url: "https://archive-ouverte.unige.ch/unige:165849" },
  easLpa: { label: "Kronenberg et al., Eur Heart J 2022 — consenso EAS sobre Lp(a)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9639807/" },
  dpp: { label: "Diabetes Prevention Program, NEJM 2002 — el estilo de vida redujo 58 % la diabetes", url: "https://pubmed.ncbi.nlm.nih.gov/11832527/" },
  easlMasld: { label: "Guía EASL-EASD-EASO 2024 de hígado graso (MASLD) y FIB-4", url: "https://air.unimi.it/retrieve/0a880a86-ba08-4c65-b360-8e3c6f92a121/s00125-024-06196-3.pdf" },
} satisfies Record<string, Evidence>;

const PENDING = "PENDIENTE DE VALIDAR con médico asesor.";

export const BIOMARKERS: Biomarker[] = [
  {
    code: "glucose_fasting",
    name: "Glucosa en ayunas",
    category: "glucose",
    synonyms: ["glucosa", "glicemia", "glucemia", "glicemia basal", "glucosa basal", "glucosa en suero", "glucose"],
    unit: "mg/dL",
    conversions: [
      { unit: "mg/dl", factor: 1 },
      { unit: "mmol/l", factor: 18.016 },
    ],
    reference: { low: 70, high: 99 },
    optimal: { low: 70, high: 90 },
    betterWhen: "in_range",
    meaningfulChange: 5,
    source: `Referencia: ADA Standards of Care 2025 (100–125 = prediabetes). Óptimo: criterio conservador, ${PENDING}`,
    evidence: [EV.dpp],
  },
  {
    code: "hba1c",
    name: "Hemoglobina glicosilada (HbA1c)",
    category: "glucose",
    synonyms: ["hba1c", "hemoglobina glicosilada", "hemoglobina glucosilada", "a1c", "hemoglobina a1c"],
    unit: "%",
    conversions: [
      { unit: "%", factor: 1 },
      { unit: "mmol/mol", factor: 0.09148, offset: 2.152 },
    ],
    reference: { high: 5.6 },
    optimal: { high: 5.4 },
    betterWhen: "lower",
    meaningfulChange: 0.2,
    source: `Referencia: ADA 2025 (5.7–6.4 % prediabetes, ≥6.5 % diabetes). Óptimo: ${PENDING}`,
    evidence: [EV.dpp],
  },
  {
    code: "total_cholesterol",
    name: "Colesterol total",
    category: "lipids",
    synonyms: ["colesterol total", "colesterol", "cholesterol total", "ct"],
    unit: "mg/dL",
    conversions: [
      { unit: "mg/dl", factor: 1 },
      { unit: "mmol/l", factor: 38.67 },
    ],
    reference: { high: 199 },
    optimal: { high: 180 },
    betterWhen: "lower",
    meaningfulChange: 15,
    source: `Referencia: NCEP ATP III (<200 mg/dL deseable). Óptimo: ${PENDING}`,
    evidence: [EV.easLdl],
  },
  {
    code: "ldl",
    name: "Colesterol LDL",
    category: "lipids",
    synonyms: ["ldl", "colesterol ldl", "c-ldl", "ldl colesterol", "colesterol de baja densidad", "ldl directo", "ldl calculado"],
    unit: "mg/dL",
    conversions: [
      { unit: "mg/dl", factor: 1 },
      { unit: "mmol/l", factor: 38.67 },
    ],
    reference: { high: 129 },
    optimal: { high: 99 },
    betterWhen: "lower",
    meaningfulChange: 10,
    source: "NCEP ATP III: <100 óptimo, 100–129 cercano a óptimo, 130–159 limítrofe, ≥190 muy alto.",
    evidence: [EV.easLdl, EV.escLipids],
  },
  {
    code: "hdl",
    name: "Colesterol HDL",
    category: "lipids",
    synonyms: ["hdl", "colesterol hdl", "c-hdl", "hdl colesterol", "colesterol de alta densidad"],
    unit: "mg/dL",
    conversions: [
      { unit: "mg/dl", factor: 1 },
      { unit: "mmol/l", factor: 38.67 },
    ],
    reference: { male: { low: 40 }, female: { low: 50 } },
    optimal: { low: 60 },
    betterWhen: "higher",
    meaningfulChange: 4,
    source: "NCEP ATP III / IDF: bajo <40 (hombres) o <50 (mujeres); ≥60 protector.",
  },
  {
    code: "triglycerides",
    name: "Triglicéridos",
    category: "lipids",
    synonyms: ["trigliceridos", "triglicéridos", "tg", "triglycerides"],
    unit: "mg/dL",
    conversions: [
      { unit: "mg/dl", factor: 1 },
      { unit: "mmol/l", factor: 88.57 },
    ],
    reference: { high: 149 },
    optimal: { high: 99 },
    betterWhen: "lower",
    meaningfulChange: 20,
    source: "NCEP ATP III (<150 normal). Óptimo <100: AHA Scientific Statement on Triglycerides (Miller et al., 2011).",
  },
  {
    code: "apob",
    name: "Apolipoproteína B (ApoB)",
    category: "lipids",
    synonyms: ["apob", "apo b", "apolipoproteina b", "apolipoproteína b", "apolipoproteina b100", "apo b-100", "apolipoprotein b"],
    unit: "mg/dL",
    conversions: [
      { unit: "mg/dl", factor: 1 },
      { unit: "g/l", factor: 100 },
    ],
    reference: { high: 119 },
    optimal: { high: 89 },
    betterWhen: "lower",
    meaningfulChange: 8,
    source: `Cuenta las partículas aterogénicas; mejor marcador de riesgo que el LDL cuando no coinciden. Metas ESC/EAS 2019: <100 mg/dL riesgo moderado, <80 alto, <65 muy alto. Referencia y óptimo: ${PENDING}`,
    evidence: [EV.escLipids, EV.easLdl],
  },
  {
    code: "lpa",
    name: "Lipoproteína(a) — Lp(a)",
    category: "lipids",
    synonyms: ["lp(a)", "lpa", "lipoproteina a", "lipoproteína a", "lipoproteina (a)", "lipoproteína (a)", "lipoprotein(a)"],
    unit: "mg/dL",
    conversions: [
      { unit: "mg/dl", factor: 1 },
      // Molar ↔ mass conversion depends on isoform size; ~2.15 nmol/L per mg/dL is the usual approximation.
      { unit: "nmol/l", factor: 0.465 },
    ],
    reference: { high: 49 },
    optimal: { high: 29 },
    betterWhen: "lower",
    meaningfulChange: 10,
    source: `Mayormente genética; basta medirla una vez en la vida. Consenso EAS 2022: >50 mg/dL (~105 nmol/L) aumenta el riesgo cardiovascular, <30 mg/dL lo descarta. ${PENDING}`,
    notes: "La conversión desde nmol/L es aproximada.",
    evidence: [EV.easLpa],
  },
  {
    code: "ast",
    name: "AST (TGO)",
    category: "liver",
    synonyms: ["ast", "tgo", "transaminasa oxalacetica", "transaminasa glutamico oxalacetica", "aspartato aminotransferasa", "sgot"],
    unit: "U/L",
    conversions: [{ unit: "u/l", factor: 1 }],
    reference: { high: 40 },
    optimal: { high: 30 },
    betterWhen: "lower",
    meaningfulChange: 5,
    source: `Referencia: rango típico de laboratorio (preferir el del informe). Óptimo: ${PENDING}`,
    evidence: [EV.easlMasld],
  },
  {
    code: "alt",
    name: "ALT (TGP)",
    category: "liver",
    synonyms: ["alt", "tgp", "transaminasa piruvica", "transaminasa glutamico piruvica", "alanina aminotransferasa", "sgpt"],
    unit: "U/L",
    conversions: [{ unit: "u/l", factor: 1 }],
    reference: { high: 40 },
    optimal: { male: { high: 33 }, female: { high: 25 } },
    betterWhen: "lower",
    meaningfulChange: 5,
    source: "Referencia: rango típico de laboratorio. Óptimo: ACG Clinical Guideline (Kwo et al., 2017) — ALT normal 29–33 U/L hombres, 19–25 U/L mujeres.",
    evidence: [EV.easlMasld],
  },
  {
    code: "ggt",
    name: "Gamma glutamil transferasa (GGT)",
    category: "liver",
    synonyms: ["ggt", "gamma gt", "gamma glutamil transferasa", "gamma glutamil transpeptidasa", "ggtp"],
    unit: "U/L",
    conversions: [{ unit: "u/l", factor: 1 }],
    reference: { male: { high: 60 }, female: { high: 40 } },
    optimal: { high: 30 },
    betterWhen: "lower",
    meaningfulChange: 5,
    source: `Referencia: rango típico de laboratorio. Óptimo: ${PENDING}`,
  },
  {
    code: "creatinine",
    name: "Creatinina",
    category: "kidney",
    synonyms: ["creatinina", "creatinina en suero", "creatinina serica", "creatinine"],
    unit: "mg/dL",
    conversions: [
      { unit: "mg/dl", factor: 1 },
      { unit: "umol/l", factor: 1 / 88.42 },
    ],
    reference: { male: { low: 0.7, high: 1.3 }, female: { low: 0.6, high: 1.1 } },
    betterWhen: "in_range",
    meaningfulChange: 0.15,
    source: "Rango típico de laboratorio. Interpretar junto con TFG estimada (KDIGO 2024).",
  },
  {
    code: "bun",
    name: "Nitrógeno ureico (BUN)",
    category: "kidney",
    synonyms: ["bun", "nitrogeno ureico", "nitrógeno ureico", "nitrogeno ureico en suero", "urea"],
    unit: "mg/dL",
    conversions: [
      { unit: "mg/dl", factor: 1 },
      { unit: "mmol/l", factor: 2.801 },
      // Some labs report urea (not urea nitrogen). BUN = urea / 2.14.
      { unit: "mg/dl(urea)", factor: 1 / 2.14 },
    ],
    reference: { low: 7, high: 20 },
    betterWhen: "in_range",
    meaningfulChange: 3,
    source: "Rango típico de laboratorio.",
    notes: "Si el informe reporta 'Urea' en mg/dL, la extracción usa la unidad 'mg/dL (urea)' para convertir a BUN.",
  },
  {
    code: "uric_acid",
    name: "Ácido úrico",
    category: "kidney",
    synonyms: ["acido urico", "ácido úrico", "uric acid"],
    unit: "mg/dL",
    conversions: [
      { unit: "mg/dl", factor: 1 },
      { unit: "umol/l", factor: 1 / 59.48 },
    ],
    reference: { male: { low: 3.4, high: 7.0 }, female: { low: 2.4, high: 6.0 } },
    optimal: { high: 6.0 },
    betterWhen: "lower",
    meaningfulChange: 0.5,
    source: `Referencia: rango típico. Óptimo <6: objetivo de EULAR 2016 para gota, ${PENDING}`,
  },
  {
    code: "tsh",
    name: "TSH",
    category: "thyroid",
    synonyms: ["tsh", "hormona estimulante de tiroides", "tirotropina", "tsh ultrasensible", "hormona estimulante del tiroides"],
    unit: "mUI/L",
    conversions: [{ unit: "mu/l", factor: 1 }],
    reference: { low: 0.4, high: 4.0 },
    betterWhen: "in_range",
    meaningfulChange: 0.5,
    source: "American Thyroid Association: 0.4–4.0 mUI/L (varía con edad y laboratorio).",
  },
  {
    code: "vitamin_d",
    name: "Vitamina D (25-OH)",
    category: "vitamins",
    synonyms: ["vitamina d", "25 oh vitamina d", "25-hidroxivitamina d", "25(oh)d", "vitamina d total", "vitamina d 25 hidroxi"],
    unit: "ng/mL",
    conversions: [
      { unit: "ng/ml", factor: 1 },
      { unit: "nmol/l", factor: 1 / 2.496 },
    ],
    reference: { low: 30, high: 100 },
    optimal: { low: 30, high: 60 },
    betterWhen: "in_range",
    meaningfulChange: 5,
    source: `Endocrine Society 2011 (≥30 suficiente; <20 deficiencia). La guía 2024 no recomienda tamizaje rutinario. Óptimo: ${PENDING}`,
  },
  {
    code: "vitamin_b12",
    name: "Vitamina B12",
    category: "vitamins",
    synonyms: ["vitamina b12", "b12", "cobalamina", "cianocobalamina"],
    unit: "pg/mL",
    conversions: [
      { unit: "pg/ml", factor: 1 },
      { unit: "pmol/l", factor: 1.355 },
      { unit: "ng/l", factor: 1 },
    ],
    reference: { low: 200, high: 900 },
    optimal: { low: 400 },
    betterWhen: "in_range",
    meaningfulChange: 50,
    source: `Referencia: rango típico (<200 deficiencia). Óptimo: ${PENDING}`,
  },
  {
    code: "hemoglobin",
    name: "Hemoglobina",
    category: "blood_count",
    synonyms: ["hemoglobina", "hb", "hgb", "hemoglobin"],
    unit: "g/dL",
    conversions: [
      { unit: "g/dl", factor: 1 },
      { unit: "g/l", factor: 0.1 },
      { unit: "mmol/l", factor: 1.611 },
    ],
    reference: { male: { low: 13.5, high: 17.5 }, female: { low: 12.0, high: 15.5 } },
    betterWhen: "in_range",
    meaningfulChange: 0.7,
    source: "Rango típico de laboratorio; OMS define anemia <13 (hombres) y <12 (mujeres).",
    notes: "En altura (p. ej. Bogotá, ~2.600 m) la OMS ajusta los puntos de corte hacia arriba. PENDIENTE decidir si se aplica el ajuste.",
  },
  {
    code: "hematocrit",
    name: "Hematocrito",
    category: "blood_count",
    synonyms: ["hematocrito", "hto", "hct", "hematocrit"],
    unit: "%",
    conversions: [
      { unit: "%", factor: 1 },
      { unit: "l/l", factor: 100 },
    ],
    reference: { male: { low: 41, high: 53 }, female: { low: 36, high: 46 } },
    betterWhen: "in_range",
    meaningfulChange: 2,
    source: "Rango típico de laboratorio (nivel del mar).",
  },
  {
    code: "platelets",
    name: "Plaquetas",
    category: "blood_count",
    synonyms: ["plaquetas", "recuento de plaquetas", "plt", "platelets"],
    unit: "10³/µL",
    conversions: [
      { unit: "10^3/ul", factor: 1 },
      { unit: "/ul", factor: 0.001 },
    ],
    reference: { low: 150, high: 450 },
    betterWhen: "in_range",
    meaningfulChange: 30,
    source: "Rango típico de laboratorio.",
    evidence: [EV.easlMasld],
  },
  {
    code: "wbc",
    name: "Leucocitos",
    category: "blood_count",
    synonyms: ["leucocitos", "recuento de leucocitos", "globulos blancos", "glóbulos blancos", "wbc", "recuento de globulos blancos"],
    unit: "10³/µL",
    conversions: [
      { unit: "10^3/ul", factor: 1 },
      { unit: "/ul", factor: 0.001 },
    ],
    reference: { low: 4.0, high: 11.0 },
    betterWhen: "in_range",
    meaningfulChange: 1,
    source: "Rango típico de laboratorio.",
  },
  {
    code: "eosinophils_pct",
    name: "Eosinófilos (%)",
    category: "blood_count",
    synonyms: ["eosinofilos %", "eosinófilos %", "eosinofilos porcentaje", "eos %"],
    unit: "%",
    conversions: [{ unit: "%", factor: 1 }],
    reference: { low: 0, high: 6 },
    betterWhen: "in_range",
    meaningfulChange: 1,
    source: "Rango típico de laboratorio.",
  },
  {
    code: "eosinophils_abs",
    name: "Eosinófilos (absolutos)",
    category: "blood_count",
    synonyms: ["eosinofilos #", "eosinófilos absolutos", "eosinofilos absolutos", "recuento de eosinofilos", "eos #"],
    unit: "10³/µL",
    conversions: [
      { unit: "10^3/ul", factor: 1 },
      { unit: "/ul", factor: 0.001 },
    ],
    reference: { low: 0, high: 0.5 },
    betterWhen: "in_range",
    meaningfulChange: 0.1,
    source: "Rango típico de laboratorio (>0.5 ×10³/µL = eosinofilia).",
  },
  {
    code: "hscrp",
    name: "PCR ultrasensible",
    category: "inflammation",
    synonyms: ["pcr ultrasensible", "proteina c reactiva ultrasensible", "pcr-us", "hs-crp", "pcr alta sensibilidad"],
    unit: "mg/L",
    conversions: [
      { unit: "mg/l", factor: 1 },
      { unit: "mg/dl", factor: 10 },
    ],
    reference: { high: 3.0 },
    optimal: { high: 1.0 },
    betterWhen: "lower",
    meaningfulChange: 0.5,
    source: "AHA/CDC 2003 (Pearson et al.): <1 riesgo bajo, 1–3 promedio, >3 alto. >10 sugiere proceso agudo.",
  },
  {
    code: "uacr",
    name: "Microalbuminuria (relación albúmina/creatinina)",
    category: "kidney",
    synonyms: ["microalbuminuria", "relacion albumina creatinina", "relación albúmina/creatinina", "rac", "uacr", "albumina en orina"],
    unit: "mg/g",
    conversions: [
      { unit: "mg/g", factor: 1 },
      { unit: "ug/mg", factor: 1 },
      { unit: "mg/mmol", factor: 8.84 },
    ],
    reference: { high: 29 },
    optimal: { high: 10 },
    betterWhen: "lower",
    meaningfulChange: 5,
    source: `KDIGO 2024: A1 <30, A2 30–300, A3 >300 mg/g. Óptimo: ${PENDING}`,
    notes: "Si el laboratorio solo reporta concentración (mg/L) no es comparable: el admin debe anotarlo.",
  },
];

export const BIOMARKER_BY_CODE: ReadonlyMap<string, Biomarker> = new Map(BIOMARKERS.map((b) => [b.code, b]));

export function getBiomarker(code: string): Biomarker {
  const b = BIOMARKER_BY_CODE.get(code);
  if (!b) throw new Error(`Unknown biomarker code: ${code}`);
  return b;
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9%#()]+/g, " ")
    .trim();
}

const SYNONYM_INDEX: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const b of BIOMARKERS) {
    m.set(normalizeName(b.code), b.code);
    m.set(normalizeName(b.name), b.code);
    for (const s of b.synonyms) m.set(normalizeName(s), b.code);
  }
  return m;
})();

/** Resolve a lab's name for a test to a canonical code, or null if unknown. */
export function matchBiomarker(labName: string): string | null {
  return SYNONYM_INDEX.get(normalizeName(labName)) ?? null;
}
