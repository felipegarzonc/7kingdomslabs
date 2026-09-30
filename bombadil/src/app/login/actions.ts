"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { step: "email" | "code"; email?: string; error?: string; message?: string };

const Email = z.string().trim().toLowerCase().email();

export async function sendCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = Email.safeParse(form.get("email"));
  if (!parsed.success) return { step: "email", error: "Escribe un correo válido." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    // Only people invited by the operator can sign in.
    options: { shouldCreateUser: false, emailRedirectTo: `${env.siteUrl()}/auth/confirm` },
  });
  if (error) {
    // Do not reveal whether the email is registered.
    console.error("signInWithOtp", error.message);
  }
  return {
    step: "code",
    email: parsed.data,
    message: "Si tu correo está invitado al piloto, te enviamos un código de 6 dígitos y un enlace para entrar.",
  };
}

export async function verifyCode(prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = Email.safeParse(form.get("email"));
  if (!parsed.success) return { ...prev, error: "Vuelve a escribir tu correo." };
  const email = parsed.data;
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  if (token.length < 6) return { ...prev, error: "El código tiene 6 dígitos." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { ...prev, error: "Código inválido o vencido. Pide uno nuevo." };
  await supabase.rpc("link_participant");
  redirect("/");
}
