import Link from "next/link";
import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

export function AppShell({ children, links, badge, home }: { children: React.ReactNode; links: Array<{ href: string; label: string }>; badge?: React.ReactNode; home: string }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Brand href={home} />
            {badge}
          </div>
          <form action="/auth/signout" method="post">
            <button className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface-2">Salir</button>
          </form>
        </div>
        <NavLinks links={links} />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-muted">
        Bombadil es acompañamiento de bienestar y educación: no diagnostica ni reemplaza a tu médico. Emergencias: 123.{" "}
        <Link href="/privacidad" className="underline">
          Privacidad
        </Link>
      </footer>
    </div>
  );
}
