/**
 * One-shot production deploy: Supabase (already set up with supabase/setup.sql)
 * + Vercel project linked to GitHub, env vars, deploy, auth URLs, /estado check.
 *
 * Needs in the environment (never pasted into chat):
 *   VERCEL_TOKEN                 Vercel *account* token (Account Settings → Tokens; NOT an AI Gateway `vck_` key)
 *   SUPABASE_ACCESS_TOKEN        Supabase account token (`sbp_…`)
 *   BOMBADIL_ANTHROPIC_API_KEY   Anthropic key (`sk-ant-…`), passed to Vercel as ANTHROPIC_API_KEY
 * Optional:
 *   SUPABASE_PROJECT_REF (default: the pilot project), GIT_REPO, GIT_BRANCH, VERCEL_PROJECT
 *
 * Usage: npx tsx scripts/deploy-vercel.ts
 */

const SUPABASE_REF = process.env.SUPABASE_PROJECT_REF ?? "imwsoftnxhrhazgranay";
const GIT_REPO = process.env.GIT_REPO ?? "felipegarzonc/7kingdomslabs";
const GIT_BRANCH = process.env.GIT_BRANCH ?? "claude/bombadil-longevity-coach-ef7aiv";
const PROJECT = process.env.VERCEL_PROJECT ?? "bombadil";

const vt = need("VERCEL_TOKEN");
const st = need("SUPABASE_ACCESS_TOKEN");
const anthropicKey = process.env.BOMBADIL_ANTHROPIC_API_KEY?.trim() ?? "";

function need(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) fail(`Falta ${name} en el entorno.`);
  return v!;
}
function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
const step = (msg: string) => console.log(`→ ${msg}`);

async function api<T>(base: string, token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(base + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw Object.assign(new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${JSON.stringify(body.error ?? body.message ?? body).slice(0, 400)}`), { status: res.status, body });
  return body as T;
}

async function main() {
  if (vt.startsWith("vck_")) fail("VERCEL_TOKEN es una llave de AI Gateway (vck_…). Crea un token en vercel.com/account/settings/tokens.");
  if (!anthropicKey.startsWith("sk-ant-")) console.warn("! BOMBADIL_ANTHROPIC_API_KEY falta o no empieza por sk-ant-: la app funcionará, pero sin leer PDFs ni generar informes.");

  // ── Supabase keys ──
  step("Leyendo llaves del proyecto Supabase");
  const keys = await api<Array<{ name: string; api_key: string }>>("https://api.supabase.com", st, `/v1/projects/${SUPABASE_REF}/api-keys?reveal=true`);
  const anon = keys.find((k) => k.name === "anon")?.api_key;
  const service = keys.find((k) => k.name === "service_role")?.api_key;
  if (!anon || !service) fail("No encontré las llaves anon/service_role del proyecto Supabase.");
  const supabaseUrl = `https://${SUPABASE_REF}.supabase.co`;

  // ── Vercel team + project ──
  const V = "https://api.vercel.com";
  const user = await api<{ user: { defaultTeamId?: string; username: string } }>(V, vt, "/v2/user");
  const teamId = user.user.defaultTeamId;
  const q = teamId ? `?teamId=${teamId}` : "";
  const qa = teamId ? `&teamId=${teamId}` : "";
  step(`Cuenta Vercel: ${user.user.username}${teamId ? ` (equipo ${teamId})` : ""}`);

  type Project = { id: string; name: string; link?: { repoId?: number; type?: string } };
  let project: Project;
  try {
    project = await api<Project>(V, vt, `/v9/projects/${PROJECT}${q}`);
    step(`Proyecto existente: ${project.name}`);
  } catch (e) {
    if ((e as { status?: number }).status !== 404) throw e;
    step("Creando proyecto Vercel vinculado a GitHub");
    try {
      project = await api<Project>(V, vt, `/v11/projects${q}`, {
        method: "POST",
        body: JSON.stringify({ name: PROJECT, framework: "nextjs", rootDirectory: "bombadil", gitRepository: { type: "github", repo: GIT_REPO } }),
      });
    } catch (err) {
      fail(
        `No pude crear el proyecto (${(err as Error).message}).\n  Si el error habla de GitHub: instala la app de Vercel en el repo ${GIT_REPO} (vercel.com/new → Import Git Repository → Adjust GitHub App Permissions).\n  Si dice "permission": el token no tiene permisos sobre el equipo.`,
      );
    }
  }
  await api(V, vt, `/v9/projects/${project.id}${q}`, { method: "PATCH", body: JSON.stringify({ rootDirectory: "bombadil", framework: "nextjs" }) });

  // ── Env vars (upsert) ──
  const domains = await api<{ domains: Array<{ name: string }> }>(V, vt, `/v9/projects/${project.id}/domains${q}`).catch(() => ({ domains: [] }));
  let siteUrl = domains.domains[0] ? `https://${domains.domains[0].name}` : `https://${PROJECT}.vercel.app`;
  const envs: Record<string, { value: string; type: "plain" | "encrypted" | "sensitive" }> = {
    NEXT_PUBLIC_SUPABASE_URL: { value: supabaseUrl, type: "plain" },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: { value: anon!, type: "plain" },
    SUPABASE_SERVICE_ROLE_KEY: { value: service!, type: "sensitive" },
    NEXT_PUBLIC_SITE_URL: { value: siteUrl, type: "plain" },
    CHECKIN_AUTO_SEND: { value: "true", type: "plain" },
  };
  if (anthropicKey) envs.ANTHROPIC_API_KEY = { value: anthropicKey, type: "sensitive" };
  const setEnv = async () => {
    step("Cargando variables de entorno");
    await api(V, vt, `/v10/projects/${project.id}/env?upsert=true${qa}`, {
      method: "POST",
      body: JSON.stringify(Object.entries(envs).map(([key, v]) => ({ key, value: v.value, type: v.type, target: ["production", "preview"] }))),
    });
  };
  await setEnv();

  // ── Deploy ──
  const deploy = async () => {
    step(`Publicando rama ${GIT_BRANCH}`);
    const repoId = project.link?.repoId ?? (await api<Project>(V, vt, `/v9/projects/${project.id}${q}`)).link?.repoId;
    if (!repoId) fail("El proyecto no está vinculado a GitHub (falta repoId).");
    const d = await api<{ id: string; url: string }>(V, vt, `/v13/deployments${q}`, {
      method: "POST",
      body: JSON.stringify({ name: PROJECT, project: project.id, target: "production", gitSource: { type: "github", repoId, ref: GIT_BRANCH } }),
    });
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 10_000));
      const s = await api<{ readyState: string; alias?: string[] }>(V, vt, `/v13/deployments/${d.id}${q}`);
      if (s.readyState === "READY") return s;
      if (s.readyState === "ERROR" || s.readyState === "CANCELED") fail(`El build falló (${s.readyState}). Revisa los logs: https://vercel.com/${user.user.username}/${PROJECT}`);
      if (i % 3 === 0) step(`  estado: ${s.readyState}`);
    }
    fail("La publicación tardó demasiado.");
  };
  let ready = await deploy();

  // The production alias is only known after the first deploy.
  const alias = ready.alias?.find((a) => a.endsWith(".vercel.app") && !a.includes("-git-")) ?? ready.alias?.[0];
  if (alias && `https://${alias}` !== siteUrl) {
    siteUrl = `https://${alias}`;
    envs.NEXT_PUBLIC_SITE_URL.value = siteUrl;
    await setEnv();
    ready = await deploy();
  }

  // ── Supabase auth URLs ──
  step("Configurando URLs de acceso en Supabase");
  await api("https://api.supabase.com", st, `/v1/projects/${SUPABASE_REF}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify({ site_url: siteUrl, uri_allow_list: `${siteUrl}/auth/confirm,${siteUrl}/**` }),
  });

  // ── Self-check ──
  step("Revisando /estado");
  const html = await (await fetch(`${siteUrl}/estado`)).text();
  const failed = [...html.matchAll(/✗<\/span>\s*(?:<!-- -->)?\s*([^<]+)/g)].map((m) => m[1].trim());
  console.log(`\n✓ Bombadil publicado: ${siteUrl}`);
  console.log(failed.length ? `  Pendiente según /estado: ${failed.join(", ")}` : "  /estado: todo en verde.");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
