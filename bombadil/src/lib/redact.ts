/**
 * Masks identifying data in lab report text before it is sent to the LLM
 * (docs/BRIEF.md §7). Deliberately aggressive: the human reviewer sees the
 * original PDF, the model only needs analytes, values, units and dates.
 */

const MASK = "[REDACTADO]";

// Labels whose value (rest of the line) identifies the person.
const LABELLED = [
  "paciente",
  "nombre(?:s)?(?: y apellidos?)?",
  "apellidos?",
  "usuario",
  "documento(?: de identidad)?",
  "identificaci[oó]n",
  "c\\.?\\s?c\\.?",
  "c[eé]dula(?: de ciudadan[ií]a)?",
  "tipo y n[uú]mero de documento",
  "n[uú]mero de documento",
  "historia cl[ií]nica",
  "h\\.?\\s?c\\.?",
  "direcci[oó]n",
  "tel[eé]fono",
  "celular",
  "correo(?: electr[oó]nico)?",
  "e-?mail",
  "m[eé]dico(?: tratante| remitente)?",
  "remitido por",
  "fecha de nacimiento",
  "f\\.?\\s?nac\\.?",
  "eps|aseguradora|entidad",
];

const LABEL_RE = new RegExp(`(^|\\n|\\s{2,}|\\|)\\s*(${LABELLED.join("|")})\\s*[:.]\\s*([^\\n|]*)`, "gi");
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Colombian phone numbers (mobile 3xx xxx xxxx, landline 60x xxx xxxx) with optional +57.
const PHONE_RE = /(?:\+?57[\s-]?)?(?:3\d{2}|60\d)[\s-]?\d{3}[\s-]?\d{4}\b/g;
// Document numbers: CC/TI/CE/NIT followed by 5–12 digits (with optional dots).
const DOC_RE = /\b(?:CC|C\.C\.|TI|T\.I\.|CE|C\.E\.|NIT|RC|PA)\s*[:#.]?\s*\d{1,3}(?:[.\s]?\d{3}){1,3}\b/gi;

export interface RedactionResult {
  text: string;
  redactions: number;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param knownNames tokens known to identify the participant (e.g. display
 *   name parts, email local part). Tokens shorter than 3 chars are ignored.
 */
export function redactPii(input: string, knownNames: string[] = []): RedactionResult {
  let count = 0;
  let text = input.replace(LABEL_RE, (_m, pre: string, label: string, value: string) => {
    if (!value.trim()) return `${pre}${label}:`;
    count++;
    return `${pre}${label}: ${MASK}`;
  });
  for (const re of [EMAIL_RE, DOC_RE, PHONE_RE]) {
    text = text.replace(re, () => {
      count++;
      return MASK;
    });
  }
  const tokens = knownNames
    .flatMap((n) => n.split(/[\s._-]+/))
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
  for (const t of new Set(tokens)) {
    const re = new RegExp(`\\b${escapeRe(t)}\\b`, "gi");
    text = text.replace(re, () => {
      count++;
      return MASK;
    });
  }
  return { text, redactions: count };
}
