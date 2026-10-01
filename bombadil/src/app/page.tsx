import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing";
import { getViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TITLE = "Entiende tus exámenes de sangre y mejora tu salud | Bombadil";
const DESCRIPTION =
  "Sube tus exámenes y entiende tu colesterol, glucosa, triglicéridos e hígado en palabras simples. Recibe 3 hábitos pequeños para mejorarlos y mide tu avance. Colombia.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default async function Home() {
  const v = await getViewer();
  if (v) {
    if (v.isAdmin) redirect("/admin");
    if (!v.participant) redirect("/sin-acceso");
    if (v.participant.status === "invited") redirect("/onboarding");
    redirect("/app");
  }
  return <Landing />;
}
