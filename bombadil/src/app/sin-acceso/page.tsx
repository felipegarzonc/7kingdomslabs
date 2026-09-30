import { PublicShell } from "@/components/brand";
import { Card } from "@/components/ui";

export default function NoAccess() {
  return (
    <PublicShell>
      <Card title="Tu cuenta no está en el piloto">
        <p className="text-sm text-muted">Entraste con un correo que no tiene una invitación activa. Escríbele al operador del piloto si crees que es un error.</p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button className="text-sm font-semibold text-accent underline-offset-2 hover:underline">Cerrar sesión</button>
        </form>
      </Card>
    </PublicShell>
  );
}
