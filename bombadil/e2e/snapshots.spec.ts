/**
 * Captures fully rendered screens (after hydration, charts drawn) of the real
 * app with SYNTHETIC demo data, for a clickable static preview.
 *   SNAPSHOT_DIR=/tmp/snaps npm run test:e2e -- e2e/snapshots.spec.ts
 * Writes snapshots.json: { css, pages: { "<path>": { title, body } } }.
 */
import { test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { seedDemo } from "../scripts/demo-data";

const DIR = process.env.SNAPSHOT_DIR;
test.skip(!DIR, "snapshot capture only");
test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false });

const EMAIL = "demo@bombadil.local";
const pages: Record<string, { title: string; body: string }> = {};
let css = "";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Recibir código" }).click();
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

async function capture(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300); // let Recharts measure and draw
  const snap = await page.evaluate(() => {
    const body = document.body.cloneNode(true) as HTMLElement;
    body.querySelectorAll("script, next-route-announcer, nextjs-portal").forEach((n) => n.remove());
    // Keep typed-in defaults visible without scripts.
    body.querySelectorAll("input").forEach((i) => i.setAttribute("value", (i as HTMLInputElement).value));
    const sheets = [...document.styleSheets]
      .filter((s) => !s.href || s.href.includes("/_next/"))
      .map((s) => {
        try {
          return [...s.cssRules].map((r) => r.cssText).join("\n");
        } catch {
          return "";
        }
      })
      .join("\n");
    return { title: document.title, body: body.outerHTML, css: sheets };
  });
  if (snap.css.length > css.length) css = snap.css;
  pages[route] = { title: snap.title, body: snap.body };
}

test("seed", async () => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  await seedDemo(db, { participantEmail: EMAIL, operatorEmail: "operador@bombadil.local" });
});

test("participant screens", async ({ page }) => {
  await capture(page, "/login");
  await capture(page, "/privacidad");
  await capture(page, "/consentimiento");
  await login(page, EMAIL);
  for (const r of ["/app", "/app/checkin", "/app/mediciones", "/app/linea-de-tiempo", "/app/examenes", "/app/metas", "/app/informes", "/app/datos"]) await capture(page, r);
  const codes = await page.evaluate(async () => {
    const html = await (await fetch("/app/linea-de-tiempo")).text();
    return [...new Set([...html.matchAll(/\/app\/linea-de-tiempo\/([a-z0-9_]+)/g)].map((m) => m[1]))];
  });
  for (const c of codes) await capture(page, `/app/linea-de-tiempo/${c}`);
});

test("operator screens", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await login(page, "operador@bombadil.local");
  for (const r of ["/admin", "/admin/participantes", "/admin/documentos", "/admin/documentos?all=1", "/admin/checkins", "/admin/alertas", "/admin/alertas?all=1", "/admin/auditoria", "/admin/participantes/nuevo"]) await capture(page, r);
  const links = await page.evaluate(async () => {
    const list = await (await fetch("/admin/participantes")).text();
    const pid = list.match(/\/admin\/participantes\/([0-9a-f-]{36})/)?.[1];
    const detail = pid ? await (await fetch(`/admin/participantes/${pid}`)).text() : "";
    const report = detail.match(/\/admin\/informes\/([0-9a-f-]{36})/)?.[1];
    return { pid, report };
  });
  if (links.pid) await capture(page, `/admin/participantes/${links.pid}`);
  if (links.report) await capture(page, `/admin/informes/${links.report}`);
  // The detail views above are audit-logged: capture the log last so it shows them.
  await capture(page, "/admin/auditoria");
  await ctx.close();
  writeFileSync(path.join(DIR!, "snapshots.json"), JSON.stringify({ css, pages }));
});
