import { describe, expect, it } from "vitest";
import { redactPii } from "../redact";

const SAMPLE = `LABORATORIO CLÍNICO SINTÉTICO S.A.S.
Paciente: JUAN CARLOS PÉREZ GÓMEZ        Documento: CC 1.020.304.050
Fecha de nacimiento: 15/08/1982   Edad: 43 años   Sexo: M
Teléfono: 310 555 1234   Correo: juan.perez@example.com
Médico remitente: DRA. ANA LÓPEZ
Fecha de toma: 20/05/2026
QUÍMICA SANGUÍNEA
Colesterol HDL      37     mg/dL     40 - 60
Triglicéridos       231    mg/dL     0 - 150
TGP (ALT)           52     U/L       0 - 41
Observación: muestra tomada a Juan en ayunas.`;

describe("redactPii", () => {
  const r = redactPii(SAMPLE, ["Juan Carlos Pérez Gómez", "juan.perez"]);

  it("removes names, document, phone, email, birth date and physician", () => {
    for (const s of ["JUAN", "PÉREZ", "1.020.304.050", "310 555 1234", "juan.perez@example.com", "15/08/1982", "ANA LÓPEZ"]) {
      expect(r.text).not.toContain(s);
    }
    expect(r.text).not.toMatch(/\bJuan\b/);
  });

  it("keeps analytes, values, units, ranges and sample date", () => {
    for (const s of ["Colesterol HDL", "37", "mg/dL", "40 - 60", "Triglicéridos", "231", "TGP (ALT)", "52", "U/L", "Fecha de toma: 20/05/2026"]) {
      expect(r.text).toContain(s);
    }
  });

  it("counts redactions", () => {
    expect(r.redactions).toBeGreaterThanOrEqual(5);
  });

  it("does not treat lab values as phone numbers", () => {
    expect(redactPii("Plaquetas 250000 /uL 150000 - 450000").text).toContain("250000");
  });
});
