import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client — BYPASSES RLS. Only for:
 *  - creating auth users for invited participants / bootstrapping admins
 *  - full account deletion (auth user + storage files)
 *  - signing short-lived URLs for private PDFs
 * Every caller must have already verified the actor is an admin or the data owner.
 */
export function createServiceClient() {
  return createSupabaseClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
