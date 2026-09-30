/**
 * E2E-only stand-ins for hosted services, so the real app can run end to end
 * against a local Postgres + PostgREST:
 *   :54321  Supabase-compatible gateway (auth, /rest/v1 → PostgREST, storage)
 *   :54322  Anthropic-compatible /v1/messages returning canned, schema-valid output
 * The OTP code is always 123456. NEVER use outside tests.
 */
import { createHmac, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import pg from "pg";

const SECRET = process.env.JWT_SECRET;
const PGURL = process.env.PG_URL;
const POSTGREST = process.env.POSTGREST_URL ?? "http://127.0.0.1:54323";
const FILES = process.env.STORAGE_DIR;
const pool = new pg.Pool({ connectionString: PGURL, max: 4 });

const b64u = (b) => Buffer.from(b).toString("base64url");
export function sign(claims) {
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify(claims));
  return `${h}.${p}.${createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url")}`;
}
function verify(token) {
  const [h, p, s] = (token ?? "").split(".");
  if (!s || createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url") !== s) return null;
  const c = JSON.parse(Buffer.from(p, "base64url").toString());
  return c.exp && c.exp < Date.now() / 1000 ? null : c;
}
const bearer = (req) => verify((req.headers.authorization ?? "").replace(/^Bearer /, ""));
const body = (req) => new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
const json = (res, status, obj) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };

function session(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const u = { id: user.id, email: user.email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  return { access_token: sign({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", exp }), token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: `r_${user.id}`, user: u };
}

/** Run a query as a JWT's role, the way PostgREST would (so storage RLS applies). */
async function asClaims(claims, sql, params) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    if (claims.role !== "service_role") {
      await c.query(`set local role ${claims.role === "authenticated" ? "authenticated" : "anon"}`);
      await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    }
    const r = await c.query(sql, params);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}

async function auth(req, res, url) {
  const p = url.pathname.replace("/auth/v1", "");
  if (p === "/otp" && req.method === "POST") return json(res, 200, {});
  if (p === "/verify" && req.method === "POST") {
    const b = JSON.parse((await body(req)).toString() || "{}");
    if (b.token !== "123456" && !b.token_hash) return json(res, 403, { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" });
    const email = (b.email ?? b.token_hash?.replace(/^hash_/, "")).toLowerCase();
    const { rows } = await pool.query("select id, email from auth.users where email = $1", [email]);
    if (!rows.length) return json(res, 403, { code: 403, msg: "User not found" });
    return json(res, 200, session(rows[0]));
  }
  if (p === "/token" && url.searchParams.get("grant_type") === "refresh_token") {
    const b = JSON.parse((await body(req)).toString() || "{}");
    const { rows } = await pool.query("select id, email from auth.users where id = $1", [String(b.refresh_token).slice(2)]);
    return rows.length ? json(res, 200, session(rows[0])) : json(res, 400, { msg: "bad refresh" });
  }
  if (p === "/user" && req.method === "GET") {
    const c = bearer(req);
    if (!c || c.role !== "authenticated") return json(res, 401, { msg: "invalid JWT" });
    return json(res, 200, { id: c.sub, email: c.email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} });
  }
  if (p === "/logout") { res.writeHead(204); return res.end(); }
  if (p === "/admin/users" && req.method === "POST") {
    if (bearer(req)?.role !== "service_role") return json(res, 403, {});
    const b = JSON.parse((await body(req)).toString());
    const email = b.email.toLowerCase();
    const ex = await pool.query("select id from auth.users where email=$1", [email]);
    if (ex.rows.length) return json(res, 422, { code: 422, error_code: "email_exists", msg: "A user with this email address has already been registered" });
    const { rows } = await pool.query("insert into auth.users (email) values ($1) returning id, email", [email]);
    return json(res, 200, { id: rows[0].id, email, aud: "authenticated", app_metadata: {}, user_metadata: {} });
  }
  const del = p.match(/^\/admin\/users\/([0-9a-f-]+)$/);
  if (del && req.method === "DELETE") {
    if (bearer(req)?.role !== "service_role") return json(res, 403, {});
    await pool.query("delete from auth.users where id=$1", [del[1]]);
    return json(res, 200, {});
  }
  json(res, 404, { msg: `fake auth: ${req.method} ${p} not implemented` });
}

async function storage(req, res, url) {
  const p = decodeURIComponent(url.pathname.replace("/storage/v1", ""));
  const claims = bearer(req) ?? { role: "anon" };
  const fileOf = (bucket, name) => path.join(FILES, bucket, name);
  let m;
  if ((m = p.match(/^\/object\/(?!sign\/|list\/|authenticated\/)([^/]+)\/(.+)$/)) && req.method === "POST") {
    const [, bucket, name] = m;
    const data = await body(req);
    try {
      await asClaims(claims, "insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, name]);
    } catch (e) {
      return json(res, 403, { statusCode: "403", error: "Unauthorized", message: String(e.message) });
    }
    mkdirSync(path.dirname(fileOf(bucket, name)), { recursive: true });
    writeFileSync(fileOf(bucket, name), data);
    return json(res, 200, { Key: `${bucket}/${name}`, Id: randomUUID() });
  }
  if ((m = p.match(/^\/object\/(?:authenticated\/)?([^/]+)\/(.+)$/)) && req.method === "GET" && !p.startsWith("/object/sign/")) {
    const [, bucket, name] = m;
    const r = await asClaims(claims, "select 1 from storage.objects where bucket_id=$1 and name=$2", [bucket, name]);
    if (!r.rowCount || !existsSync(fileOf(bucket, name))) return json(res, 404, { message: "not found" });
    res.writeHead(200, { "content-type": "application/pdf" });
    return res.end(readFileSync(fileOf(bucket, name)));
  }
  if ((m = p.match(/^\/object\/sign\/([^/]+)\/(.+)$/)) && req.method === "POST") {
    const [, bucket, name] = m;
    const r = await asClaims(claims, "select 1 from storage.objects where bucket_id=$1 and name=$2", [bucket, name]);
    if (!r.rowCount) return json(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
    const token = sign({ url: `${bucket}/${name}`, exp: Math.floor(Date.now() / 1000) + 120 });
    return json(res, 200, { signedURL: `/object/sign/${bucket}/${name}?token=${token}` });
  }
  if ((m = p.match(/^\/object\/sign\/([^/]+)\/(.+)$/)) && req.method === "GET") {
    const c = verify(url.searchParams.get("token"));
    if (!c || c.url !== `${m[1]}/${m[2]}`) return json(res, 400, { message: "invalid signature" });
    res.writeHead(200, { "content-type": "application/pdf" });
    return res.end(readFileSync(fileOf(m[1], m[2])));
  }
  if ((m = p.match(/^\/object\/list\/([^/]+)$/)) && req.method === "POST") {
    const b = JSON.parse((await body(req)).toString());
    const dir = path.join(FILES, m[1], b.prefix ?? "");
    return json(res, 200, existsSync(dir) ? readdirSync(dir).map((n) => ({ name: n, id: n })) : []);
  }
  if ((m = p.match(/^\/object\/([^/]+)$/)) && req.method === "DELETE") {
    const b = JSON.parse((await body(req)).toString());
    for (const name of b.prefixes ?? []) {
      await asClaims(claims, "delete from storage.objects where bucket_id=$1 and name=$2", [m[1], name]);
      rmSync(fileOf(m[1], name), { force: true });
    }
    return json(res, 200, (b.prefixes ?? []).map((n) => ({ name: n })));
  }
  json(res, 404, { message: `fake storage: ${req.method} ${p} not implemented` });
}

async function rest(req, res, url) {
  const target = new URL(url.pathname.replace("/rest/v1", "") + url.search, POSTGREST);
  const headers = { ...req.headers };
  delete headers.host;
  delete headers["content-length"];
  const data = req.method === "GET" || req.method === "HEAD" ? undefined : await body(req);
  const r = await fetch(target, { method: req.method, headers, body: data });
  const out = Buffer.from(await r.arrayBuffer());
  const h = {};
  r.headers.forEach((v, k) => { if (!["content-encoding", "transfer-encoding", "content-length"].includes(k)) h[k] = v; });
  res.writeHead(r.status, h);
  res.end(out);
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname.startsWith("/auth/v1")) return await auth(req, res, url);
      if (url.pathname.startsWith("/rest/v1")) return await rest(req, res, url);
      if (url.pathname.startsWith("/storage/v1")) return await storage(req, res, url);
      json(res, 404, {});
    } catch (e) {
      console.error(e);
      json(res, 500, { message: String(e) });
    }
  })
  .listen(54321, () => console.log("fake supabase on :54321"));

// ─── Fake Anthropic ─────────────────────────────────────────────────────────
const EXTRACTION = {
  lab_name: "Laboratorio Sintético",
  sampled_on: "2026-05-20",
  results: [
    { name_as_printed: "Colesterol HDL", biomarker_code: "hdl", value: 37, qualifier: null, unit: "mg/dL", ref_low: 40, ref_high: 60, section: "Química" },
    { name_as_printed: "Triglicéridos", biomarker_code: "triglycerides", value: 231, qualifier: null, unit: "mg/dL", ref_low: 0, ref_high: 150, section: "Química" },
    { name_as_printed: "TGP (ALT)", biomarker_code: "alt", value: 52, qualifier: null, unit: "U/L", ref_low: 0, ref_high: 41, section: "Química" },
    { name_as_printed: "Glicemia basal", biomarker_code: "glucose_fasting", value: 5.7, qualifier: null, unit: "mmol/L", ref_low: 3.9, ref_high: 5.5, section: "Química" },
    { name_as_printed: "Ferritina", biomarker_code: null, value: 180, qualifier: null, unit: "ng/mL", ref_low: 30, ref_high: 400, section: "Química" },
  ],
};
const REPORT = {
  headline: "Tus datos muestran un patrón compatible con resistencia a la insulina que vale la pena atender ahora.",
  worsened: ["HDL bajó a 37 mg/dL.", "Triglicéridos subieron a 231 mg/dL.", "ALT subió a 52 U/L."],
  improved: [],
  stable: [],
  connections: "HDL bajando, triglicéridos y ALT subiendo y cintura alta son un mismo cuadro metabólico, no cuatro problemas.",
  priorities: [
    { title: "Caminar 30 minutos después del almuerzo, 5 días", kind: "must", why: "Mejora triglicéridos y glucosa.", how: "Pon una alarma a la 1:30 p. m." },
    { title: "Cambiar la gaseosa por agua o tinto sin azúcar", kind: "must", why: "Menos azúcar libre baja los triglicéridos.", how: "Deja la gaseosa solo para el fin de semana." },
  ],
  see_doctor: "Consulta tu presión arterial y la glucosa en tu próxima cita; lleva tus registros.",
  closing: "Pocas cosas, bien hechas, cada semana.",
};
http
  .createServer(async (req, res) => {
    const b = JSON.parse((await body(req)).toString() || "{}");
    const system = typeof b.system === "string" ? b.system : JSON.stringify(b.system ?? "");
    let text;
    if (system.includes("transcribe informes")) {
      const user = JSON.stringify(b.messages);
      if (user.includes("JUAN") || user.includes("1.020.304.050")) text = JSON.stringify({ error: "PII LEAKED TO LLM" });
      else text = JSON.stringify(EXTRACTION);
    } else if (system.includes("informe interpretativo")) text = JSON.stringify(REPORT);
    else text = "Semana sólida con la caminata. Esta semana intenta repetirla también el sábado.";
    json(res, 200, { id: `msg_${randomUUID()}`, type: "message", role: "assistant", model: b.model, content: [{ type: "text", text }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } });
  })
  .listen(54322, () => console.log("fake anthropic on :54322"));
