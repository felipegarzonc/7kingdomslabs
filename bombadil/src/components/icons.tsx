/** Stroke icons (24×24) shared by the participant app. Decorative unless given a label. */
const PATHS = {
  home: "M3 11 12 4l9 7v9h-6v-6H9v6H3Z",
  path: "M6 21c0-5 12-4 12-9S6 8 6 3M6 3h.01M18 12h.01M6 21h.01",
  swords: "M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2",
  user: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21c1-4 4-6 8-6s7 2 8 6",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  flask: "M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7.5 15h9",
  watch: "M7 7h10v10H7ZM9 7l1-3h4l1 3M9 17l1 3h4l1-3",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
  check: "m5 12 5 5 9-10",
  lock: "M5 11h14v10H5ZM8 11V8a4 4 0 0 1 8 0v3",
  chest: "M3 9h18v11H3ZM3 13h18M12 9v11M5 9l2-4h10l2 4",
  trophy: "M8 21h8M12 17v4M6 4h12v4a6 6 0 0 1-12 0ZM6 6H3a3 3 0 0 0 3 4M18 6h3a3 3 0 0 1-3 4",
  heartPulse: "M12 21s-7-4.5-9-9.5C1.6 7.8 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.4 7.8 21 11.5 19 16.5 12 21 12 21ZM3 12h4l2-3 3 6 2-3h7",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  // Attributes
  movimiento: "M13 4a2 2 0 1 0 0-.1M10 21l2-6 3 3v3M8 12l3-3 3 2 3 1M11 9l-1 6",
  fuerza: "M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12",
  sueno: "M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10Z",
  nutricion: "M12 21c-5-3-8-7-8-12 4 0 7 2 8 5 1-3 4-5 8-5 0 5-3 9-8 12Z",
  estres: "M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 21c2-4 4-6 7-6s5 2 7 6M8 13l4 2 4-2",
  conexion: "M8 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM16 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM3 21c1-3 3-4 5-4s4 1 5 4M11 21c1-3 3-4 5-4s4 1 5 4",
  sustancias: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z",
  sabiduria: "M4 5h10a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3ZM17 8h3v12",
  // Achievements
  steps: "M7 20c0-3 1-5 3-5s2 2 2 5M14 15c0-3 1-5 3-5s2 2 2 5M9 9h.01M16 5h.01",
  calendar: "M4 6h16v14H4ZM4 10h16M9 3v4M15 3v4M9 15l2 2 4-4",
  sprout: "M12 21V11M12 11c0-4 3-6 7-6 0 4-3 6-7 6ZM12 14c0-3-2-5-6-5 0 3 2 5 6 5Z",
  compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM15 9l-4 2-2 4 4-2Z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7Z",
  star: "m12 2 3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8Z",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 11h.01",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, className, strokeWidth = 2.2, label }: { name: IconName; size?: number; className?: string; strokeWidth?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Filled glyphs for the stat counters. */
export function Flame({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-4-1-6 1-9.5Z" fill="#f97316" stroke="#c2410c" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
export function Shield({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
export function Bolt({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7Z" fill="var(--gold)" stroke="#8a6510" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** The Bombadil hat on a blue tile. */
export function HatAvatar({ size = 56, level }: { size?: number; level?: number }) {
  return (
    <span className="relative inline-flex shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bombadil-icon.svg" alt="" width={size} height={size} className="rounded-2xl" />
      {level !== undefined ? (
        <span className="absolute -right-2 -bottom-2 flex size-7 items-center justify-center rounded-full border-[3px] border-surface bg-gold text-xs font-black text-[#1b2433]">{level}</span>
      ) : null}
    </span>
  );
}
