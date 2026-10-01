import type { Metadata } from "next";
import { PublicShell } from "@/components/brand";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: true } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <PublicShell>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Entra a Bombadil</h1>
      <p className="mt-2 max-w-prose text-muted">Tus exámenes explicados y tus hábitos de hoy, en un solo lugar.</p>
      <Card className="mt-8 max-w-md">
        {error ? <p className="mb-3 text-sm text-danger">El enlace no es válido o expiró. Pide un código nuevo.</p> : null}
        <LoginForm />
      </Card>
      <p className="mt-4 text-xs text-muted">El acceso es por invitación durante el piloto.</p>
    </PublicShell>
  );
}
