import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-serif text-lg font-semibold tracking-tight">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
      Bombadil
    </Link>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
      <header className="mb-8">
        <Brand />
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-10 flex flex-wrap gap-4 text-xs text-muted">
        <Link href="/privacidad" className="underline-offset-2 hover:underline">
          Aviso de privacidad
        </Link>
        <Link href="/consentimiento" className="underline-offset-2 hover:underline">
          Consentimiento informado
        </Link>
        <span>Bombadil no reemplaza a tu médico. Emergencias: 123.</span>
      </footer>
    </div>
  );
}
