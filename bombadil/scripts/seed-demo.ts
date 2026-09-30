/**
 * Fills a LOCAL database with a synthetic demo participant.
 *   npm run demo:seed -- tu@correo.com
 * The email becomes the operator; the demo participant is demo@bombadil.local.
 * Refuses to run against a non-local Supabase URL.
 */
import { createClient } from "@supabase/supabase-js";
import { seedDemo } from "./demo-data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (see .env.local).");
  process.exit(1);
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url) && process.env.ALLOW_REMOTE_DEMO !== "yes") {
  console.error(`Refusing to seed demo data into ${url}. Demo data is for local development only.`);
  process.exit(1);
}
const operator = process.argv[2];
const db = createClient(url, key, { auth: { persistSession: false } });
seedDemo(db, { participantEmail: "demo@bombadil.local", operatorEmail: operator })
  .then(() => {
    console.log("✓ Demo data loaded.");
    if (operator) console.log(`  Operator:    ${operator}  → /admin`);
    console.log("  Participant: demo@bombadil.local  → /app");
    console.log("  Login codes arrive in the local inbox: http://127.0.0.1:54324");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
