"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { cx } from "./ui";

/** Personaje hub, in priority order: who you are, your health, your devices, your data. */
export const PROFILE_TABS: Array<{ href: string; label: string; icon: IconName; match: string[] }> = [
  { href: "/app/progreso", label: "Personaje", icon: "user", match: ["/app/progreso"] },
  { href: "/app/examenes", label: "Salud", icon: "flask", match: ["/app/examenes", "/app/informes", "/app/metas", "/app/mediciones", "/app/linea-de-tiempo"] },
  { href: "/app/conexiones", label: "Dispositivos", icon: "watch", match: ["/app/conexiones"] },
  { href: "/app/datos", label: "Mis datos", icon: "folder", match: ["/app/datos"] },
];

/** Inside Salud, also by priority: what you upload most, then what it tells you, then the details. */
const HEALTH_TABS = [
  { href: "/app/examenes", label: "Exámenes" },
  { href: "/app/informes", label: "Informe" },
  { href: "/app/metas", label: "Metas" },
  { href: "/app/mediciones", label: "Mediciones" },
  { href: "/app/linea-de-tiempo", label: "Línea de tiempo" },
];

export const PROFILE_PREFIXES = PROFILE_TABS.flatMap((t) => t.match);

export function ProfileTabs() {
  const path = usePathname();
  const isOn = (prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(p + "/"));
  const inHealth = isOn(PROFILE_TABS[1].match);
  return (
    <div className="mb-6 flex flex-col gap-3">
      <nav aria-label="Personaje" className="overflow-x-auto [scrollbar-width:none]">
        <ul className="flex gap-2 border-b-2 border-border">
          {PROFILE_TABS.map((t) => {
            const on = isOn(t.match);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "-mb-0.5 flex min-h-12 items-center gap-2 border-b-4 px-3 text-sm font-black tracking-wide whitespace-nowrap uppercase",
                    on ? "border-accent text-accent-strong" : "border-transparent text-[#4a5568] hover:text-text",
                  )}
                >
                  <Icon name={t.icon} size={20} />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {inHealth ? (
        <nav aria-label="Salud" className="overflow-x-auto [scrollbar-width:none]">
          <ul className="flex gap-2">
            {HEALTH_TABS.map((t) => {
              const on = path === t.href || path.startsWith(t.href + "/");
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-current={on ? "page" : undefined}
                    className={cx(
                      "flex min-h-10 items-center rounded-full border-2 px-4 text-sm font-extrabold whitespace-nowrap",
                      on ? "border-accent bg-accent text-white" : "border-border bg-surface text-text hover:bg-surface-2",
                    )}
                  >
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
