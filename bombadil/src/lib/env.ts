import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  anthropicModel: () => process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  anthropicEffort: (): "low" | "medium" | "high" | "xhigh" | "max" => {
    const e = process.env.ANTHROPIC_EFFORT;
    return e === "low" || e === "medium" || e === "high" || e === "xhigh" || e === "max" ? e : "high";
  },
  /** Replies reach the participant right away unless explicitly held for operator review. */
  checkinAutoSend: () => process.env.CHECKIN_AUTO_SEND !== "false",
  alertWebhookUrl: () => process.env.ALERT_WEBHOOK_URL || null,
};
