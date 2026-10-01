import { redirect } from "next/navigation";

/** The timeline now lives on the Exámenes page; marker details stay at /app/linea-de-tiempo/<code>. */
export default function TimelinePage() {
  redirect("/app/examenes#resultados");
}
