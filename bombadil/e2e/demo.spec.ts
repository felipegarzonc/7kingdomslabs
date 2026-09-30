/**
 * Visual demo, not a test: seeds a SYNTHETIC participant with three years of
 * labs, an ABPM, goals, an approved report and a check-in, then screenshots
 * the main screens. Runs only with DEMO_DIR set:
 *   DEMO_DIR=/tmp/demo npm run test:e2e -- e2e/demo.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { seedDemo } from "../scripts/demo-data";

const DIR = process.env.DEMO_DIR;
test.skip(!DIR, "demo only");
test.describe.configure({ mode: "serial" });

const EMAIL = "demo@bombadil.test";

async function seed() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  await seedDemo(db, { participantEmail: EMAIL });
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Recibir código" }).click();
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(DIR!, `${name}.png`), fullPage: true });

test("seed demo data", async () => {
  await seed();
});

test("participant screens", async ({ page }) => {
  await login(page, EMAIL);
  await page.goto("/app");
  await expect(page.getByText("Tus prioridades")).toBeVisible();
  await shot(page, "p1-inicio");
  await page.goto("/app/linea-de-tiempo");
  await shot(page, "p2-linea-de-tiempo");
  await page.goto("/app/linea-de-tiempo/hdl");
  await shot(page, "p3-hdl");
  await page.goto("/app/linea-de-tiempo/triglycerides");
  await shot(page, "p4-trigliceridos");
  await page.goto("/app/mediciones");
  await shot(page, "p5-mediciones");
  await page.goto("/app/metas");
  await shot(page, "p6-metas");
  await page.goto("/app/informes");
  await shot(page, "p7-informe");
  await page.goto("/app/checkin");
  await shot(page, "p8-checkin");
  await page.goto("/login");
  await shot(page, "p0-login");
});

test("operator screens (desktop)", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const db = new pg.Client({ connectionString: process.env.E2E_PG_URL });
  await db.connect();
  const { rows: [p] } = await db.query("select id from participants where email=$1", [EMAIL]);
  await db.end();
  await login(page, "admin@bombadil.test");
  await page.goto("/admin");
  await shot(page, "a1-panel");
  await page.goto(`/admin/participantes/${p.id}`);
  await shot(page, "a2-ficha");
  await page.goto("/admin/checkins");
  await shot(page, "a3-checkins");
  await page.goto("/app/linea-de-tiempo/triglycerides");
  await ctx.close();
});
