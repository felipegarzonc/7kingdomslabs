import type { Metadata } from "next";
import { Landing } from "@/components/landing";
import { getViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Entiende tus exámenes de sangre y mejora tu salud | Bombadil" },
  alternates: { canonical: "/" },
  // Same page as "/": only the canonical URL should be indexed.
  robots: { index: false, follow: true },
};

/** The landing page even when signed in, to review or share it. */
export default async function InicioPage() {
  return <Landing signedIn={!!(await getViewer())} />;
}
