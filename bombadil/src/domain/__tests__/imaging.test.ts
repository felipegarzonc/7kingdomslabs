import { describe, expect, it } from "vitest";
import { imagingAlarm } from "../imaging";

describe("imagingAlarm", () => {
  it("is quiet for a report whose worrying words are all negated", () => {
    const text =
      "Esguince grado I de la raíz posterior, sin evidencia de ruptura. Tendinosis sin ruptura de fibras. No se identifica quiste de Baker. No se observa masa.";
    expect(imagingAlarm(text)).toEqual([]);
  });

  it("asks for a prompt visit when the report names an alarm finding", () => {
    const [t] = imagingAlarm("Se observa fractura no desplazada del maléolo lateral.");
    expect(t).toMatchObject({ ruleId: "imaging_alarm_finding", level: "consult_soon", evidence: "keyword:fractura" });
  });

  it("matches without accents or case", () => {
    expect(imagingAlarm("LESIÓN OCUPANTE de espacio en lóbulo hepático derecho")).toHaveLength(1);
    expect(imagingAlarm("Nódulo tiroideo TI-RADS 5")).toHaveLength(1);
  });
});
