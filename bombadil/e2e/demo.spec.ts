/**
 * Visual demo, not a test: seeds a SYNTHETIC participant with three years of
 * labs, an ABPM, goals, an approved report and a check-in, then screenshots
 * the main screens. Runs only with DEMO_DIR set:
 *   DEMO_DIR=/tmp/demo npm run test:e2e -- e2e/demo.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import pg from "pg";

const DIR = process.env.DEMO_DIR;
test.skip(!DIR, "demo only");
test.describe.configure({ mode: "serial" });

const EMAIL = "demo@bombadil.test";

async function seed() {
  const db = new pg.Client({ connectionString: process.env.E2E_PG_URL });
  await db.connect();
  const q = (sql: string, p: unknown[] = []) => db.query(sql, p);
  const { rows: [u] } = await q("insert into auth.users (email) values ($1) returning id", [EMAIL]);
  const start = new Date(Date.now() - 38 * 864e5).toISOString().slice(0, 10); // pilot week 6
  const { rows: [p] } = await q(
    `insert into participants (auth_user_id, email, display_name, birth_date, sex, height_cm, personal_goal, priorities, pilot_start, status)
     values ($1,$2,'Felipe (demo)','1982-08-15','male',176,'Llegar a los 80 con energía y sin medicamentos.',
     array['Caminar 30 min después del almuerzo, 5 días','Cambiar la gaseosa por agua o tinto sin azúcar','Dormir 7 h: pantalla apagada a las 10 p. m.'],$3,'active') returning id`,
    [u.id, EMAIL, start],
  );
  await q("insert into consents (participant_id, version, text_hash) values ($1,'2026-09-v1','demo')", [p.id]);

  const labs: Record<string, [string, string, number, number, number | null, number | null][]> = {
    "2023-03-10": [["hdl", "mg/dL", 46, 46, 40, null], ["triglycerides", "mg/dL", 150, 150, null, 150], ["alt", "U/L", 30, 30, null, 41], ["ast", "U/L", 24, 24, null, 40], ["glucose_fasting", "mg/dL", 94, 94, 70, 100], ["ldl", "mg/dL", 128, 128, null, 130], ["total_cholesterol", "mg/dL", 205, 205, null, 200], ["hba1c", "%", 5.4, 5.4, null, 5.7], ["vitamin_d", "ng/mL", 24, 24, 30, 100]],
    "2025-04-02": [["hdl", "mg/dL", 41, 41, 40, null], ["triglycerides", "mg/dL", 188, 188, null, 150], ["alt", "U/L", 41, 41, null, 41], ["ast", "U/L", 29, 29, null, 40], ["glucose_fasting", "mg/dL", 99, 99, 70, 100], ["ldl", "mg/dL", 134, 134, null, 130], ["total_cholesterol", "mg/dL", 210, 210, null, 200], ["hba1c", "%", 5.6, 5.6, null, 5.7], ["vitamin_d", "ng/mL", 31, 31, 30, 100]],
    "2026-05-20": [["hdl", "mg/dL", 37, 37, 40, null], ["triglycerides", "mmol/L", 2.61, 231.2, null, 150], ["alt", "U/L", 52, 52, null, 41], ["ast", "U/L", 36, 36, null, 40], ["glucose_fasting", "mg/dL", 102, 102, 70, 100], ["ldl", "mg/dL", 131, 131, null, 130], ["total_cholesterol", "mg/dL", 212, 212, null, 200], ["hba1c", "%", 5.7, 5.7, null, 5.7], ["vitamin_d", "ng/mL", 38, 38, 30, 100], ["hscrp", "mg/L", 2.1, 2.1, null, 3], ["tsh", "mUI/L", 2.3, 2.3, 0.4, 4]],
  };
  const labNames = { "2023-03-10": "Colcan", "2025-04-02": "Sura", "2026-05-20": "Dinámica" } as Record<string, string>;
  for (const [date, rows] of Object.entries(labs)) {
    const { rows: [d] } = await q("insert into lab_documents (participant_id, storage_path, original_filename, lab_name, sampled_on, status, reviewed_at) values ($1,$2,$3,$4,$5,'reviewed',now()) returning id", [p.id, `${p.id}/${date}.pdf`, `${date}.pdf`, labNames[date], date]);
    for (const [code, unit, orig, canon, lo, hi] of rows) {
      await q("insert into lab_results (document_id, participant_id, biomarker_code, sampled_on, value_original, unit_original, value_canonical, lab_ref_low, lab_ref_high) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [d.id, p.id, code, date, orig, unit, canon, lo, hi]);
    }
  }
  // Weekly weight/waist trending down, home BP, and a 24 h ABPM (non-dipper).
  for (let w = 0; w < 6; w++) {
    const at = new Date(Date.parse(start) + (w * 7 + 2) * 864e5 + 12 * 3600e3).toISOString();
    await q("insert into measurements (participant_id,type,value,unit,measured_at,source) values ($1,'weight',$2,'kg',$3,'checkin'),($1,'waist',$4,'cm',$3,'checkin'),($1,'sleep_hours',$5,'h',$3,'checkin'),($1,'exercise_minutes',$6,'min',$3,'checkin')", [p.id, 89.5 - w * 0.45, at, 99 - w * 0.4, 6.1 + w * 0.15, 60 + w * 25]);
    const g = crypto.randomUUID();
    await q("insert into measurements (participant_id,type,value,unit,measured_at,group_id,context) values ($1,'bp_systolic',$2,'mmHg',$4,$5,'{\"arm\":\"left\",\"period\":\"day\"}'),($1,'bp_diastolic',$3,'mmHg',$4,$5,'{\"arm\":\"left\",\"period\":\"day\"}')", [p.id, 147 - w, 81 - (w % 2), at, g]);
  }
  const abpmDay = new Date(Date.now() - 10 * 864e5);
  for (let i = 0; i < 8; i++) {
    const night = i >= 5;
    const t = new Date(abpmDay.getTime() + (night ? 7 + i : 14 + i * 2) * 3600e3).toISOString();
    const g = crypto.randomUUID();
    const ctx = JSON.stringify({ arm: "left", period: night ? "night" : "day", source: "abpm" });
    await q("insert into measurements (participant_id,type,value,unit,measured_at,group_id,context,source) values ($1,'bp_systolic',$2,'mmHg',$4,$5,$6,'abpm'),($1,'bp_diastolic',$3,'mmHg',$4,$5,$6,'abpm')", [p.id, night ? 139 + (i % 2) : 145 + (i % 3), night ? 76 : 80 - (i % 2), t, g, ctx]);
  }
  const goalStart = start;
  await q("insert into goals (participant_id, metric, baseline, target, horizon_months, start_date, deadline) values ($1,'waist',99,94,3,$2,($2::date + interval '3 months')::date),($1,'exercise_minutes',60,150,3,$2,($2::date + interval '3 months')::date),($1,'triglycerides',231,150,6,$2,($2::date + interval '6 months')::date)", [p.id, goalStart]);

  const report = {
    headline: "Tus datos de tres años cuentan una sola historia: un patrón compatible con resistencia a la insulina que empezó en 2023 y hoy vale la pena atender.",
    worsened: ["HDL bajó de 46 (2023) a 37 mg/dL (2026), por debajo de 40.", "Triglicéridos subieron de 150 a 231 mg/dL.", "ALT pasó de 30 a 52 U/L, por encima del rango del laboratorio."],
    improved: ["Vitamina D subió de 24 a 38 ng/mL: ya está en rango."],
    stable: ["LDL (≈130 mg/dL), TSH y PCR ultrasensible sin cambios relevantes."],
    connections: "HDL bajando, triglicéridos y transaminasas subiendo, glucosa en 102 y una cintura de 98 cm no son cinco problemas: son un mismo cuadro metabólico. Cumples criterios de síndrome metabólico (ATP III 4/5). La presión sistólica elevada con un descenso nocturno de solo 4 % (non-dipper) encaja en ese mismo cuadro.",
    priorities: [
      { title: "Caminar 30 min después del almuerzo, 5 días", kind: "must", why: "Es la palanca con más efecto sobre triglicéridos, glucosa y presión a la vez.", how: "Alarma a la 1:30 p. m.; si llueve, escaleras del edificio." },
      { title: "Cambiar la gaseosa por agua o tinto sin azúcar", kind: "must", why: "El azúcar libre es el principal motor de los triglicéridos y del hígado graso.", how: "Deja la gaseosa solo para el domingo." },
      { title: "Dormir 7 h: pantalla apagada a las 10 p. m.", kind: "nice", why: "Dormir poco empeora la presión nocturna y el apetito.", how: "Cargador del celular fuera del cuarto." },
    ],
    see_doctor: "Consulta pronto por la presión: tu MAPA muestra promedio diurno ≈146/80 y patrón non-dipper. Menciona en la cita el ALT elevado y la glucosa en rango de prediabetes; pregunta si conviene una ecografía hepática.",
    closing: "Tres cambios pequeños, sostenidos, mueven todos estos números. Revisamos en 6 semanas.",
  };
  await q("insert into reports (participant_id, content, input_snapshot, prompt_version, model, status, approved_at) values ($1,$2,'{}','report@v1','claude-opus-5-5','approved',now())", [p.id, JSON.stringify(report)]);
  const week = Math.floor((Date.now() - Date.parse(start)) / (7 * 864e5)) + 1;
  for (let w = 1; w < week; w++) {
    const { rows: [c] } = await q("insert into checkins (participant_id, week, adherence, free_text, duration_seconds, submitted_at) values ($1,$2,$3,$4,$5,$6) returning id", [p.id, w, JSON.stringify([{ priority: "Caminar 30 min después del almuerzo, 5 días", status: w > 2 ? "done" : "partial" }]), w === week - 1 ? "Las caminatas ya son rutina; el fin de semana me cuesta." : null, 70 + w * 5, new Date(Date.parse(start) + (w * 7 - 1) * 864e5).toISOString()]);
    if (w === week - 1) await q("insert into checkin_replies (checkin_id, participant_id, draft, status) values ($1,$2,$3,'draft')", [c.id, p.id, "Cuatro semanas seguidas con la caminata y la cintura ya bajó 2 cm desde tu línea base. Para el fin de semana, prueba amarrarla a algo que ya haces: caminar al mercado el sábado en vez de ir en carro."]);
    else await q("insert into checkin_replies (checkin_id, participant_id, final_text, status, sent_at) values ($1,$2,$3,'sent',now())", [c.id, p.id, "Buena semana: cumpliste la caminata casi todos los días. Sigue así; esta semana suma el cambio de la gaseosa."]);
  }
  await q("insert into pilot_feedback (participant_id, week, willingness_to_pay_cop, would_continue, comments) values ($1,6,45000,'yes','Me sirve ver todo junto por primera vez.')", [p.id]);
  await q("insert into alerts (participant_id, rule_id, level, origin, message, evidence) values ($1,'bp_stage1','next_visit','measurement','Tu presión sistólica está en rango de hipertensión. Llévale tus registros a tu médico en la próxima cita.','bp_systolic=147')", [p.id]);
  await db.end();
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
