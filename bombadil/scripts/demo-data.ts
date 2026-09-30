/**
 * SYNTHETIC demo data (not a real person): a participant in pilot week 6 with
 * three years of labs, home BP and a 24 h ABPM, goals, an approved report,
 * check-ins and willingness-to-pay feedback. Written with the service role.
 * Used by `npm run demo:seed` (local Supabase) and e2e/demo.spec.ts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { toCanonical } from "../src/domain/classify";

const DAY = 864e5;

async function ensureUser(db: SupabaseClient, email: string): Promise<string> {
  const created = await db.auth.admin.createUser({ email, email_confirm: true });
  if (created.data.user) return created.data.user.id;
  for (let page = 1; page < 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const u = data?.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (!data || data.users.length < 200) break;
  }
  throw new Error(`could not create or find ${email}: ${created.error?.message}`);
}

function check<T extends { error: { message: string } | null }>(r: T, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r;
}

export async function seedDemo(db: SupabaseClient, opts: { participantEmail: string; operatorEmail?: string }) {
  const email = opts.participantEmail.toLowerCase();
  if (opts.operatorEmail) {
    const adminId = await ensureUser(db, opts.operatorEmail.toLowerCase());
    check(await db.from("admins").upsert({ user_id: adminId }), "admins");
  }
  // Start from a clean demo participant.
  check(await db.from("participants").delete().eq("email", email), "cleanup");
  const userId = await ensureUser(db, email);
  const start = new Date(Date.now() - 38 * DAY).toISOString().slice(0, 10); // pilot week 6
  const priorities = ["Caminar 30 min después del almuerzo, 5 días", "Cambiar la gaseosa por agua o tinto sin azúcar", "Dormir 7 h: pantalla apagada a las 10 p. m."];
  const { data: p } = check(
    await db
      .from("participants")
      .insert({ auth_user_id: userId, email, display_name: "Felipe (demo)", birth_date: "1982-08-15", sex: "male", height_cm: 176, personal_goal: "Llegar a los 80 con energía y sin medicamentos.", priorities, pilot_start: start, status: "active" })
      .select("id")
      .single(),
    "participant",
  );
  const pid = p!.id as string;
  check(await db.from("consents").insert({ participant_id: pid, version: "2026-09-v1", text_hash: "demo" }), "consent");

  // ── Labs from three labs and years (one reported in mmol/L to show conversion) ──
  type Row = [code: string, unit: string, value: number, low: number | null, high: number | null];
  const labs: Array<{ date: string; lab: string; rows: Row[] }> = [
    { date: "2023-03-10", lab: "Colcan", rows: [["hdl", "mg/dL", 46, 40, null], ["triglycerides", "mg/dL", 150, null, 150], ["alt", "U/L", 30, null, 41], ["ast", "U/L", 24, null, 40], ["glucose_fasting", "mg/dL", 94, 70, 100], ["ldl", "mg/dL", 128, null, 130], ["total_cholesterol", "mg/dL", 205, null, 200], ["hba1c", "%", 5.4, null, 5.7], ["vitamin_d", "ng/mL", 24, 30, 100]] },
    { date: "2025-04-02", lab: "Sura", rows: [["hdl", "mg/dL", 41, 40, null], ["triglycerides", "mg/dL", 188, null, 150], ["alt", "U/L", 41, null, 41], ["ast", "U/L", 29, null, 40], ["glucose_fasting", "mg/dL", 99, 70, 100], ["ldl", "mg/dL", 134, null, 130], ["total_cholesterol", "mg/dL", 210, null, 200], ["hba1c", "%", 5.6, null, 5.7], ["vitamin_d", "ng/mL", 31, 30, 100]] },
    { date: "2026-05-20", lab: "Dinámica", rows: [["hdl", "mg/dL", 37, 40, null], ["triglycerides", "mmol/L", 2.61, null, 1.69], ["alt", "U/L", 52, null, 41], ["ast", "U/L", 36, null, 40], ["glucose_fasting", "mg/dL", 102, 70, 100], ["ldl", "mg/dL", 131, null, 130], ["total_cholesterol", "mg/dL", 212, null, 200], ["hba1c", "%", 5.7, null, 5.7], ["vitamin_d", "ng/mL", 38, 30, 100], ["hscrp", "mg/L", 2.1, null, 3], ["tsh", "mUI/L", 2.3, 0.4, 4]] },
  ];
  for (const l of labs) {
    const { data: doc } = check(
      await db.from("lab_documents").insert({ participant_id: pid, storage_path: `${pid}/demo-${l.date}.pdf`, original_filename: `${l.lab} ${l.date}.pdf`, lab_name: l.lab, sampled_on: l.date, status: "reviewed", reviewed_at: new Date().toISOString() }).select("id").single(),
      "document",
    );
    check(
      await db.from("lab_results").insert(
        l.rows.map(([code, unit, value, low, high]) => ({
          document_id: doc!.id,
          participant_id: pid,
          biomarker_code: code,
          sampled_on: l.date,
          value_original: value,
          unit_original: unit,
          value_canonical: toCanonical(code, value, unit),
          lab_ref_low: low === null ? null : toCanonical(code, low, unit),
          lab_ref_high: high === null ? null : toCanonical(code, high, unit),
        })),
      ),
      "lab results",
    );
  }

  // ── Weekly measurements trending the right way, home BP, and a 24 h ABPM (non-dipper) ──
  const m: Array<Record<string, unknown>> = [];
  for (let w = 0; w < 6; w++) {
    const at = new Date(Date.parse(start) + (w * 7 + 2) * DAY + 12 * 3600e3).toISOString();
    m.push(
      { type: "weight", value: +(89.5 - w * 0.45).toFixed(1), unit: "kg", measured_at: at, source: "checkin" },
      { type: "waist", value: +(99 - w * 0.4).toFixed(1), unit: "cm", measured_at: at, source: "checkin" },
      { type: "sleep_hours", value: +(6.1 + w * 0.15).toFixed(1), unit: "h", measured_at: at, source: "checkin" },
      { type: "exercise_minutes", value: 60 + w * 25, unit: "min", measured_at: at, source: "checkin" },
    );
    const g = crypto.randomUUID();
    const ctx = { arm: "left", period: "day" };
    m.push({ type: "bp_systolic", value: 147 - w, unit: "mmHg", measured_at: at, group_id: g, context: ctx }, { type: "bp_diastolic", value: 81 - (w % 2), unit: "mmHg", measured_at: at, group_id: g, context: ctx });
  }
  const abpm = Date.now() - 10 * DAY;
  for (let i = 0; i < 8; i++) {
    const night = i >= 5;
    const at = new Date(abpm + (night ? 7 + i : 14 + i * 2) * 3600e3).toISOString();
    const g = crypto.randomUUID();
    const ctx = { arm: "left", period: night ? "night" : "day" };
    m.push(
      { type: "bp_systolic", value: night ? 139 + (i % 2) : 145 + (i % 3), unit: "mmHg", measured_at: at, group_id: g, context: ctx, source: "abpm" },
      { type: "bp_diastolic", value: night ? 76 : 80 - (i % 2), unit: "mmHg", measured_at: at, group_id: g, context: ctx, source: "abpm" },
    );
  }
  check(await db.from("measurements").insert(m.map((x) => ({ source: "manual", context: {}, group_id: null, ...x, participant_id: pid }))), "measurements");

  const plus = (months: number) => {
    const d = new Date(start);
    d.setUTCMonth(d.getUTCMonth() + months);
    return d.toISOString().slice(0, 10);
  };
  check(
    await db.from("goals").insert([
      { participant_id: pid, metric: "waist", baseline: 99, target: 94, horizon_months: 3, start_date: start, deadline: plus(3) },
      { participant_id: pid, metric: "exercise_minutes", baseline: 60, target: 150, horizon_months: 3, start_date: start, deadline: plus(3) },
      { participant_id: pid, metric: "triglycerides", baseline: 231, target: 150, horizon_months: 6, start_date: start, deadline: plus(6) },
    ]),
    "goals",
  );

  const report = {
    headline: "Tus datos de tres años cuentan una sola historia: un patrón compatible con resistencia a la insulina que empezó en 2023 y hoy vale la pena atender.",
    worsened: ["HDL bajó de 46 (2023) a 37 mg/dL (2026), por debajo de 40.", "Triglicéridos subieron de 150 a 231 mg/dL.", "ALT pasó de 30 a 52 U/L, por encima del rango del laboratorio."],
    improved: ["Vitamina D subió de 24 a 38 ng/mL: ya está en rango."],
    stable: ["LDL (≈130 mg/dL), TSH y PCR ultrasensible sin cambios relevantes."],
    connections:
      "HDL bajando, triglicéridos y transaminasas subiendo, glucosa en 102 y una cintura de 98 cm no son cinco problemas: son un mismo cuadro metabólico. Cumples criterios de síndrome metabólico (ATP III 4/5). La presión sistólica elevada con un descenso nocturno de solo 4 % (non-dipper) encaja en ese mismo cuadro.",
    priorities: [
      { title: priorities[0], kind: "must", why: "Es la palanca con más efecto sobre triglicéridos, glucosa y presión a la vez.", how: "Alarma a la 1:30 p. m.; si llueve, escaleras del edificio." },
      { title: priorities[1], kind: "must", why: "El azúcar libre es el principal motor de los triglicéridos y del hígado graso.", how: "Deja la gaseosa solo para el domingo." },
      { title: priorities[2], kind: "nice", why: "Dormir poco empeora la presión nocturna y el apetito.", how: "Cargador del celular fuera del cuarto." },
    ],
    see_doctor: "Consulta pronto por la presión: tu MAPA muestra promedio diurno ≈146/80 y patrón non-dipper. Menciona en la cita el ALT elevado y la glucosa en rango de prediabetes; pregunta si conviene una ecografía hepática.",
    closing: "Tres cambios pequeños, sostenidos, mueven todos estos números. Revisamos en 6 semanas.",
  };
  check(await db.from("reports").insert({ participant_id: pid, content: report, input_snapshot: { demo: true }, prompt_version: "demo", model: "demo (texto de ejemplo)", status: "approved", approved_at: new Date().toISOString() }), "report");

  const week = Math.floor((Date.now() - Date.parse(start)) / (7 * DAY)) + 1;
  for (let w = 1; w < week; w++) {
    const { data: c } = check(
      await db
        .from("checkins")
        .insert({
          participant_id: pid,
          week: w,
          adherence: [{ priority: priorities[0], status: w > 2 ? "done" : "partial" }, { priority: priorities[1], status: w > 3 ? "done" : "no" }],
          free_text: w === week - 1 ? "Las caminatas ya son rutina; el fin de semana me cuesta." : null,
          duration_seconds: 70 + w * 5,
          submitted_at: new Date(Date.parse(start) + (w * 7 - 1) * DAY).toISOString(),
        })
        .select("id")
        .single(),
      "checkin",
    );
    const last = w === week - 1;
    check(
      await db.from("checkin_replies").insert(
        last
          ? { checkin_id: c!.id, participant_id: pid, status: "draft", draft: "Cuatro semanas seguidas con la caminata y la cintura ya bajó 2 cm desde tu línea base. Para el fin de semana, amárrala a algo que ya haces: caminar al mercado el sábado en vez de ir en carro." }
          : { checkin_id: c!.id, participant_id: pid, status: "sent", final_text: "Buena semana: cumpliste la caminata casi todos los días. Sigue así; esta semana suma el cambio de la gaseosa.", sent_at: new Date().toISOString() },
      ),
      "reply",
    );
  }
  check(await db.from("pilot_feedback").insert({ participant_id: pid, week: 6, willingness_to_pay_cop: 45000, would_continue: "yes", comments: "Me sirve ver todo junto por primera vez." }), "feedback");
  check(
    await db.from("alerts").insert({ participant_id: pid, rule_id: "bp_stage1", level: "next_visit", origin: "measurement", message: "Tu presión sistólica está en rango de hipertensión. Llévale tus registros a tu médico en la próxima cita.", evidence: "bp_systolic=147" }),
    "alert",
  );
  return { participantId: pid };
}
