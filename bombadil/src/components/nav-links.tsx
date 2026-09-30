"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

export function NavLinks({ links }: { links: Array<{ href: string; label: string }> }) {
  const path = usePathname();
  const root = links[0]?.href;
  return (
    <nav className="mx-auto max-w-5xl overflow-x-auto px-2 [scrollbar-width:none]" aria-label="Principal">
      <ul className="flex gap-1 pb-2">
        {links.map((l) => {
          const active = l.href === root ? path === l.href : path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cx("block rounded-lg px-3 py-1.5 text-sm whitespace-nowrap", active ? "bg-accent-soft font-semibold text-accent-strong" : "text-muted hover:bg-surface-2")}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
