/**
 * Writes a small SYNTHETIC lab report PDF (fake patient, fake values) with a
 * real text layer. Contains fake PII on purpose: the e2e test proves it is
 * masked before reaching the (fake) LLM.
 */
import { writeFileSync } from "node:fs";

const LINES = [
  "LABORATORIO CLINICO SINTETICO S.A.S.",
  "Paciente: JUAN CARLOS PEREZ GOMEZ     Documento: CC 1.020.304.050",
  "Telefono: 310 555 1234",
  "Fecha de toma: 20/05/2026",
  "QUIMICA SANGUINEA",
  "Colesterol HDL        37     mg/dL     40 - 60",
  "Trigliceridos         231    mg/dL     0 - 150",
  "TGP (ALT)             52     U/L       0 - 41",
  "Glicemia basal        5.7    mmol/L    3.9 - 5.5",
  "Ferritina             180    ng/mL     30 - 400",
];

/** SYNTHETIC radiology report: text findings, no lab values. */
const IMAGING_LINES = [
  "CENTRO DE IMAGENES SINTETICO",
  "Paciente: JUAN CARLOS PEREZ GOMEZ     Documento: CC 1.020.304.050",
  "Fecha del examen: 2026/09/24",
  "RESONANCIA MAGNETICA SIMPLE DE LA RODILLA IZQUIERDA",
  "HALLAZGOS: Menisco medial con meniscopatia grado II, sin evidencia de ruptura.",
  "Ligamentos cruzados preservados. No se identifica quiste de Baker.",
  "IMPRESION: Meniscopatia grado II del menisco medial. Tendinosis patelar.",
];

export function makeImagingPdf(file: string) {
  writePdf(file, IMAGING_LINES);
}

export function makeLabPdf(file: string) {
  writePdf(file, LINES);
}

function writePdf(file: string, lines: string[]) {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => "\\" + c);
  const stream = ["BT", "/F1 11 Tf", "50 780 Td", "14 TL", ...lines.map((l) => `(${esc(l)}) Tj T*`), "ET"].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  writeFileSync(file, out);
}

