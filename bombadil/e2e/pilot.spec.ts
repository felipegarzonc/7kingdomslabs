/**
 * Critical flows, end to end, on a phone viewport:
 *  1. operator invites → participant consents and onboards
 *  2. deterministic urgency on a BP crisis and on alarm symptoms in the check-in
 *  3. PDF upload → PII-masked extraction → human review → timeline
 *  4. report drafted → edited/approved by the operator → visible to participant
 *  5. data rights: another participant cannot read the PDF; export; full deletion
 * Runs via `npm run test:e2e` (scripts/e2e.sh), never against production.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CONSENT_VERSION } from "../src/content/legal";
import { makeImagingPdf, makeLabPdf } from "./support/make-lab-pdf";

test.describe.configure({ mode: "serial" });

const ADMIN = "admin@bombadil.test";
const ANA = "ana@bombadil.test";
const BETO = "beto@bombadil.test";

async function login(page: Page, email: string, { expectSuccess = true } = {}) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Recibir código" }).click();
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  if (expectSuccess) await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function invite(page: Page, email: string, name: string) {
  await page.goto("/admin/participantes/nuevo");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Nombre (solo visible para ti)").fill(name);
  await page.getByLabel("Enviarle ahora el correo con el código de acceso").uncheck();
  await page.getByRole("button", { name: "Invitar" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function onboard(page: Page, email: string) {
  await login(page, email);
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("checkbox", { name: /autorizo el tratamiento/ }).check();
  await page.getByLabel("Fecha de nacimiento").fill("1982-08-15");
  await page.getByLabel("Sexo biológico").selectOption("male");
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page).toHaveURL(/\/app\/empezar$/);
}

/** Optional visual record for manual design review: SCREENSHOT_DIR=... npm run test:e2e */
async function snap(page: Page, name: string) {
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("public pages render and protected routes redirect to login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Longevidad sin humo." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quiero participar" }).first()).toHaveAttribute("href", /^mailto:/);
  await snap(page, "00-landing");
  await noHorizontalScroll(page);
  await page.getByRole("link", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Longevidad sin humo." })).toBeVisible();
  await snap(page, "01-login");
  await noHorizontalScroll(page);
  await page.goto("/privacidad");
  await expect(page.getByRole("heading", { name: "Aviso de privacidad" })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("uninvited emails cannot get in", async ({ page }) => {
  await login(page, "nadie@bombadil.test", { expectSuccess: false });
  await expect(page.getByText("Código inválido o vencido")).toBeVisible();
});

test("operator invites two participants", async ({ page }) => {
  await login(page, ADMIN);
  await expect(page.getByRole("heading", { name: "Panel del piloto" })).toBeVisible();
  await invite(page, ANA, "Ana Prueba");
  await invite(page, BETO, "Beto Prueba");
});

test("participant consents, onboards and sees the home", async ({ page }) => {
  await onboard(page, ANA);
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Hoy" })).toBeVisible();
  await expect(page.getByText("Construyamos tus hábitos de longevidad")).toBeVisible();
  await noHorizontalScroll(page);
  await page.goto("/app/datos");
  await expect(page.getByText(`Versión ${CONSENT_VERSION} · aceptado`, { exact: false })).toBeVisible();
});

test("lifestyle questionnaire → personalised habit plan → logging today", async ({ page }) => {
  await login(page, ANA);
  await page.goto("/app/empezar");
  await page.getByLabel(/Qué quieres lograr/).fill("Llegar a los 80 con energía.");
  for (const option of ["Menos de 1 hora", "Ninguno", "6 a 7", "0 a 1", "Todos los días", "1 a 7", "Alto", "20 minutos"]) {
    await page.getByText(option, { exact: true }).first().click();
  }
  await page.getByText("Fuerza", { exact: true }).click();
  await page.getByText("Sueño", { exact: true }).click();
  await snap(page, "02a-lifestyle");
  await page.getByRole("button", { name: "Crear mi plan de hábitos" }).click();
  await expect(page).toHaveURL(/\/app\?plan=nuevo$/);
  await expect(page.getByText("Tu plan está listo")).toBeVisible();
  await expect(page.getByText("Camina 10 minutos")).toBeVisible();
  await expect(page.getByText("Tus hábitos · 0 de 3 hoy")).toBeVisible();
  await page.getByRole("button", { name: "Lo hice" }).first().click();
  await expect(page.getByText("Tus hábitos · 1 de 3 hoy")).toBeVisible();
  await expect(page.getByText("1/5 esta semana").first()).toBeVisible();
  await snap(page, "02b-today");
  await noHorizontalScroll(page);
  await page.goto("/app/plan");
  await expect(page.getByText("Sugeridos para después")).toBeVisible();
  await page.getByRole("button", { name: "Empezar este" }).click();
  await expect(page.getByText(/Activos \(4\)/)).toBeVisible();
});

test("Apple Health link: data arrives on its own and logs the strength habit", async ({ page }) => {
  await login(page, ANA);
  await page.goto("/app");
  await page.getByRole("link", { name: "Conectar mis dispositivos" }).click();
  await expect(page).toHaveURL(/\/app\/conexiones$/);
  await page.getByRole("button", { name: "Crear mi enlace de Apple Salud" }).click();
  const url = await page.getByLabel("Tu enlace personal").inputValue();
  expect(url).toMatch(/\/api\/ingest\/[A-Za-z0-9_-]{20,}$/);
  await snap(page, "02c-devices");
  await noHorizontalScroll(page);

  // What Health Auto Export posts (REST API automation, grouped by day).
  const today = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
  const payload = {
    data: {
      metrics: [
        { name: "step_count", units: "count", data: [{ date: `${today} 00:00:00 -0500`, qty: 8000 }] },
        { name: "sleep_analysis", units: "hr", data: [{ date: `${today} 00:00:00 -0500`, totalSleep: 6.5 }] },
      ],
      workouts: [{ name: "Traditional Strength Training", start: `${today} 18:00:00 -0500` }],
    },
  };
  const ingestPath = new URL(url).pathname;
  const res = await page.request.post(ingestPath, { data: payload });
  expect(res.status()).toBe(200);
  // Walking was logged by hand earlier; the strength habit is logged by the data.
  expect(await res.json()).toEqual({ ok: true, stored: 2, habits_logged: 1 });
  // Re-sending the same day is idempotent.
  expect(await (await page.request.post(ingestPath, { data: payload })).json()).toEqual({ ok: true, stored: 2, habits_logged: 0 });
  expect((await page.request.post("/api/ingest/not-a-real-token-123456789", { data: payload })).status()).toBe(404);

  await page.goto("/app");
  await expect(page.getByText("Tus hábitos · 2 de 4 hoy")).toBeVisible();
  await expect(page.getByText("Registrado con Apple Salud")).toBeVisible();
  await expect(page.getByText("Tus datos de la semana")).toBeVisible();
  await expect(page.getByText("8.000").first()).toBeVisible();
  await page.goto("/app/conexiones");
  await expect(page.getByText(/Últimos datos recibidos/)).toBeVisible();
});

test("a blood pressure crisis shows an urgency immediately", async ({ page }) => {
  await login(page, ANA);
  await page.goto("/app/mediciones");
  await snap(page, "02-measurements");
  await page.getByLabel("Sistólica (alta)").fill("186");
  await page.getByLabel("Diastólica (baja)").fill("96");
  await page.getByRole("button", { name: "Guardar medición" }).click();
  await expect(page.getByText("⚠️ Atención inmediata")).toBeVisible();
  await expect(page.getByText(/rango de crisis/)).toBeVisible();
  await expect(page.getByText("Emergencias en Colombia: línea 123.")).toBeVisible();
});

test("weekly check-in with an alarm symptom escalates; the form fits a phone", async ({ page }) => {
  await login(page, ANA);
  await page.goto("/app/checkin");
  await noHorizontalScroll(page);
  const started = Date.now();
  await page.getByLabel("Peso (kg)").fill("88");
  await page.getByLabel("Cintura (cm)").fill("98");
  await page.getByLabel("Sueño promedio (h)").fill("6.5");
  await page.getByLabel("Dolor u opresión en el pecho").check();
  await page.getByLabel("¿Qué fue lo más difícil esta semana?").fill("Mucho trabajo, poco ejercicio.");
  await snap(page, "03-checkin-form");
  await page.getByRole("button", { name: /Enviar check-in/ }).click();
  await expect(page.getByText("⚠️ Atención inmediata")).toBeVisible();
  await snap(page, "04-checkin-urgency");
  await expect(page.getByText(/Recibimos tu check-in/)).toBeVisible();
  expect(Date.now() - started).toBeLessThan(120_000);
});

test("lab PDF: upload → masked extraction → automatic timeline and report; operator can correct later", async ({ page }) => {
  const pdf = path.join(mkdtempSync(path.join(tmpdir(), "bombadil-")), "examen.pdf");
  makeLabPdf(pdf);

  await login(page, ANA);
  await page.goto("/app/examenes");
  await page.getByLabel("Archivo PDF del laboratorio").setInputFiles(pdf);
  await page.getByRole("button", { name: "Subir examen" }).click();
  // The upload lands on the exam page, which follows the analysis until the plan is ready.
  await expect(page.getByText(/Analizando tu examen|Tus resultados/).first()).toBeVisible();
  await expect(page.getByText("Qué significa y qué hacer")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Glucosa en ayunas/).first()).toBeVisible();
  await expect(async () => {
    await page.goto("/app/linea-de-tiempo");
    await expect(page.getByText("Colesterol HDL")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await page.getByRole("link", { name: /Glucosa en ayunas/ }).click();
  // 5.7 mmol/L converted to canonical mg/dL.
  await expect(page.getByText("102,7").filter({ visible: true }).first()).toBeVisible();
  await snap(page, "07-marker-detail");
  await noHorizontalScroll(page);
  await expect(async () => {
    await page.goto("/app/informes");
    await expect(page.getByText(/patrón compatible con resistencia a la insulina/)).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await logout(page);

  await login(page, ADMIN);
  await page.goto("/admin/documentos?all=1");
  await page.getByRole("link", { name: /examen\.pdf|Laboratorio Sintético/ }).first().click();
  await page.waitForURL(/\/admin\/documentos\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Glicemia basal")).toBeVisible();
  await expect(page.getByText(/datos enmascarados/)).toBeVisible();
  // Ferritin is not in the catalog → not stored automatically, and listed for the operator;
  // the review table now shows the 4 stored results.
  await expect(page.getByText(/Sin guardar.*Ferritina/)).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Incluir fila 4" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Incluir fila 5" })).toHaveCount(0);
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: /Confirmar revisión/ }).click();
  await expect(page.getByText(/Guardados 4 resultados/)).toBeVisible();
});

test("imaging report: upload → masked plain-language interpretation the participant can open", async ({ page }) => {
  const pdf = path.join(mkdtempSync(path.join(tmpdir(), "bombadil-")), "resonancia.pdf");
  makeImagingPdf(pdf);

  await login(page, ANA);
  await page.goto("/app/examenes");
  await page.getByLabel("Archivo PDF del laboratorio").setInputFiles(pdf);
  await page.getByRole("button", { name: "Subir examen" }).click();
  await expect(page.getByText("Meniscopatía grado II del menisco medial")).toBeVisible({ timeout: 30_000 });
  await expect(async () => {
    await page.goto("/app/examenes");
    await expect(page.getByRole("link", { name: "Resonancia magnética · Rodilla izquierda" })).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByText("Interpretado")).toBeVisible();
  await page.getByRole("link", { name: "Resonancia magnética · Rodilla izquierda" }).click();
  await expect(page.getByText("Meniscopatía grado II del menisco medial")).toBeVisible();
  await expect(page.getByText(/Qué ejercicios me convienen/)).toBeVisible();
  await snap(page, "07b-imaging");
  await noHorizontalScroll(page);
});

test("the operator can still draft, edit and publish a report by hand", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/participantes");
  await page.getByRole("link", { name: "Ana Prueba" }).click();
  await page.getByRole("button", { name: "Generar borrador de informe" }).click();
  await expect(page.getByRole("heading", { name: "Informe" })).toBeVisible();
  await page.getByLabel("Cierre").fill("Pocas cosas, bien hechas. Revisado por el operador.");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Aprobar y publicar" }).click();
  await expect(page.getByText(/Informe aprobado y publicado/)).toBeVisible();

  await page.goto("/admin/checkins");
  await expect(page.getByRole("button", { name: "Enviar al participante" })).toBeVisible();
  await page.getByRole("button", { name: "Enviar al participante" }).click();
  await expect(page.getByText(/✓ Enviada/)).toBeVisible();
  await logout(page);

  await login(page, ANA);
  await expect(page.getByText("Caminar 30 minutos después del almuerzo, 5 días")).toBeVisible();
  await expect(page.getByText(/Semana sólida con la caminata/)).toBeVisible();
  await snap(page, "08-participant-home");
  await page.goto("/app/linea-de-tiempo");
  await snap(page, "06-timeline");
  await page.goto("/app/informes");
  await expect(page.getByText("Revisado por el operador.")).toBeVisible();
  await snap(page, "09-report");
});

test("another participant cannot open Ana's PDF", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/documentos?all=1");
  const href = await page.getByRole("link", { name: /Laboratorio Sintético/ }).first().getAttribute("href");
  const docId = href!.split("/").pop();
  await logout(page);

  await onboard(page, BETO);
  const res = await page.request.get(`/app/examenes/${docId}/pdf`, { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});

test("operator views are audit-logged; dashboard shows the pilot", async ({ page }) => {
  await login(page, ADMIN);
  await expect(page.getByText("Retención por semana")).toBeVisible();
  await snap(page, "10-admin-dashboard");
  await page.goto("/admin/auditoria");
  await expect(page.getByRole("cell", { name: "view_participant" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "review_lab" }).first()).toBeVisible();
  await page.goto("/admin/alertas");
  await expect(page.getByText("symptom:chest_pain")).toBeVisible();
});

test("participant exports and then deletes all their data", async ({ page }) => {
  await login(page, ANA);
  await page.goto("/app/datos");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar (JSON)" }).click();
  const file = await (await download).path();
  const data = JSON.parse(readFileSync(file!, "utf8"));
  expect(data.lab_results.length).toBe(4);
  expect(data.consents.length).toBe(1);

  await page.getByLabel("Escribe ELIMINAR para confirmar").fill("ELIMINAR");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Eliminar mi cuenta y todos mis datos" }).click();
  await expect(page).toHaveURL(/\/login/);

  await login(page, ANA, { expectSuccess: false });
  await expect(page.getByText("Código inválido o vencido")).toBeVisible();
});
