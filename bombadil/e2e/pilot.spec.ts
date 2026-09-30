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
import { makeLabPdf } from "./support/make-lab-pdf";

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
  await page.getByLabel("Estatura (cm)").fill("176");
  await page.getByLabel(/Qué quieres lograr/).fill("Llegar a los 80 con energía.");
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page).toHaveURL(/\/app$/);
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
  await expect(page.getByText("Semana 1 del piloto")).toBeVisible();
  await noHorizontalScroll(page);
  await page.goto("/app/datos");
  await expect(page.getByText(/Versión 2026-09-v1 · aceptado/)).toBeVisible();
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

test("lab PDF: upload → masked extraction → human review → timeline", async ({ page }) => {
  const pdf = path.join(mkdtempSync(path.join(tmpdir(), "bombadil-")), "examen.pdf");
  makeLabPdf(pdf);

  await login(page, ANA);
  await page.goto("/app/examenes");
  await page.getByLabel("Archivo PDF del laboratorio").setInputFiles(pdf);
  await page.getByRole("button", { name: "Subir examen" }).click();
  await expect(page.getByText(/Examen recibido/)).toBeVisible();
  await logout(page);

  await login(page, ADMIN);
  await page.goto("/admin/documentos");
  await page.getByRole("link", { name: /examen\.pdf|Laboratorio Sintético/ }).first().click();
  await page.waitForURL(/\/admin\/documentos\/[0-9a-f-]{36}$/);
  // Extraction runs in the background after the upload response.
  await expect(async () => {
    await page.reload();
    await expect(page.getByText("Glicemia basal")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByText(/datos enmascarados/)).toBeVisible();
  await noHorizontalScroll(page);
  // Ferritin is not in the catalog → unchecked by default.
  await expect(page.getByRole("checkbox", { name: "Incluir fila 5" })).not.toBeChecked();
  await page.getByRole("button", { name: /Confirmar revisión/ }).click();
  await expect(page.getByText(/Guardados 4 resultados/)).toBeVisible();
  await logout(page);

  await login(page, ANA);
  await page.goto("/app/linea-de-tiempo");
  await expect(page.getByText("Colesterol HDL")).toBeVisible();
  await page.getByRole("link", { name: /Glucosa en ayunas/ }).click();
  // 5.7 mmol/L converted to canonical mg/dL.
  await expect(page.getByText("102,7").filter({ visible: true }).first()).toBeVisible();
  await snap(page, "07-marker-detail");
  await noHorizontalScroll(page);
});

test("report is drafted, approved by the operator and then visible", async ({ page }) => {
  await login(page, ANA);
  await page.goto("/app/informes");
  await expect(page.getByText("Aún no tienes informes")).toBeVisible();
  await logout(page);

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
