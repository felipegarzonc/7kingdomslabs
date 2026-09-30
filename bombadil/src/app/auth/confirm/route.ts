import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Handles magic links: token_hash (recommended email template) or PKCE code. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  const code = url.searchParams.get("code");
  const supabase = await createClient();

  let ok = false;
  if (tokenHash) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  else if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;

  if (!ok) return NextResponse.redirect(new URL("/login?error=link", url.origin));
  await supabase.rpc("link_participant");
  return NextResponse.redirect(new URL("/", url.origin));
}
