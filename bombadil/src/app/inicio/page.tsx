import type { Metadata } from "next";
import { Landing } from "@/components/landing";
import { getViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Bombadil · Longevidad sin humo" },
  description: "Tus exámenes, tu reloj y hábitos pequeños que suben de nivel: un plan diario, basado en evidencia, para vivir más y mejor.",
  alternates: { canonical: "/" },
};

/** The landing page even when signed in, to review or share it. */
export default async function InicioPage() {
  return <Landing signedIn={!!(await getViewer())} />;
}
