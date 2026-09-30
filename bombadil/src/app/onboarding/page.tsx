import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/brand";
import { ConsentText } from "@/components/consent-text";
import { getViewer } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Bienvenida" };

export default async function OnboardingPage() {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (!v.participant) redirect(v.isAdmin ? "/admin" : "/sin-acceso");
  if (v.participant.status !== "invited") redirect("/app");
  return (
    <PublicShell>
      <h1 className="font-serif text-3xl font-semibold">Bienvenido a Bombadil</h1>
      <p className="mt-2 mb-8 text-muted">Tres pasos y menos de 5 minutos. Luego podrás subir tus exámenes.</p>
      <OnboardingForm consent={<ConsentText />} />
    </PublicShell>
  );
}
