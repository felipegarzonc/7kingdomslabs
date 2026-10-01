import Link from "next/link";
import { PublicShell } from "@/components/brand";
import { buttonClass, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <PublicShell>
      <Card title="Esta página no existe">
        <p className="text-sm text-muted">Revisa la dirección. La app empieza en la página de entrada.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/login" className={buttonClass("primary")}>
            Ir a entrar
          </Link>
          <Link href="/estado" className={buttonClass("secondary")}>
            Ver estado de la instalación
          </Link>
        </div>
      </Card>
    </PublicShell>
  );
}
