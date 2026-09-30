import type { Metadata } from "next";
import { PublicShell } from "@/components/brand";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <PublicShell>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Longevidad sin humo.</h1>
      <p className="mt-2 max-w-prose text-muted">
        Tus exámenes de varios años y tus hábitos, en una sola línea de tiempo, con pocas prioridades a la vez.
      </p>
      <Card className="mt-8 max-w-md">
        {error ? <p className="mb-3 text-sm text-danger">El enlace no es válido o expiró. Pide un código nuevo.</p> : null}
        <LoginForm />
      </Card>
      <p className="mt-4 text-xs text-muted">El acceso es por invitación durante el piloto.</p>
    </PublicShell>
  );
}
