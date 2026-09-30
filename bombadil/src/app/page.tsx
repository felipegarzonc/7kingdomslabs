import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (v.isAdmin) redirect("/admin");
  if (!v.participant) redirect("/sin-acceso");
  if (v.participant.status === "invited") redirect("/onboarding");
  redirect("/app");
}
