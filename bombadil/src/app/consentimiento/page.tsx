import type { Metadata } from "next";
import { PublicShell } from "@/components/brand";
import { ConsentText } from "@/components/consent-text";

export const metadata: Metadata = { title: "Consentimiento informado" };

export default function ConsentPage() {
  return (
    <PublicShell>
      <h1 className="mb-6 font-serif text-3xl font-semibold">Consentimiento informado</h1>
      <ConsentText />
    </PublicShell>
  );
}
