/**
 * Creates (or promotes) the operator account.
 * Usage: npx tsx --env-file=.env.local scripts/bootstrap-admin.ts felipe@example.com
 */
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npx tsx --env-file=.env.local scripts/bootstrap-admin.ts <email>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  let userId: string | undefined;
  const created = await db.auth.admin.createUser({ email, email_confirm: true });
  if (created.data.user) userId = created.data.user.id;
  else {
    // Already exists: find it.
    for (let page = 1; !userId && page < 50; page++) {
      const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
      userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (data.users.length < 200) break;
    }
  }
  if (!userId) throw new Error(`Could not create or find ${email}: ${created.error?.message}`);
  const { error } = await db.from("admins").upsert({ user_id: userId });
  if (error) throw error;
  console.log(`✓ ${email} is an operator. Sign in at ${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
