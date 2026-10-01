"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { cx } from "./ui";

export interface SideLink {
  href: string;
  label: string;
  icon: IconName;
  /** Other paths that belong to this section (Personaje groups several pages). */
  match?: string[];
}

/** Vertical menu on wide screens; an icon row on phones. */
export function SideNav({ links }: { links: SideLink[] }) {
  const path = usePathname();
  const root = links[0]?.href;
  return (
    <nav aria-label="Principal" className="overflow-x-auto [scrollbar-width:none]">
      <ul className="flex gap-1 md:flex-col">
        {links.map((l) => {
          const prefixes = [l.href, ...(l.match ?? [])];
          const active = l.href === root ? path === l.href : prefixes.some((p) => path === p || path.startsWith(p + "/"));
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-12 items-center gap-3 rounded-2xl border-2 px-3 text-sm font-black tracking-wide whitespace-nowrap uppercase",
                  "max-md:min-w-16 max-md:flex-col max-md:justify-center max-md:gap-0.5 max-md:px-2 max-md:py-1 max-md:text-[10px]",
                  active ? "border-[#7fa6e0] bg-accent-soft text-accent-strong" : "border-transparent text-[#4a5568] hover:bg-surface-2",
                )}
              >
                <Icon name={l.icon} size={26} />
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
