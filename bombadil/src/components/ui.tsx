import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx("min-w-0 rounded-3xl border-2 border-border bg-surface p-5 sm:p-6", className)}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-black">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

type Tone = "neutral" | "good" | "warn" | "danger" | "info";
const TONE: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  good: "bg-accent-soft text-accent-strong",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONE[tone])}>{children}</span>;
}

export function Notice({ tone = "info", title, children }: { tone?: Tone; title?: ReactNode; children?: ReactNode }) {
  const border: Record<Tone, string> = { neutral: "border-border", good: "border-accent", warn: "border-warn", danger: "border-danger", info: "border-info" };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-xl border-l-4 p-4 text-sm", TONE[tone], border[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cx(title ? "mt-1" : "", "text-text/90")}>{children}</div> : null}
    </div>
  );
}

// Chunky, tactile buttons (a darker bottom edge that presses in), as in the game screens.
const BTN = {
  primary: "bg-accent text-white border-b-4 border-black/25 hover:brightness-110 dark:text-bg",
  secondary: "border-2 border-border border-b-4 bg-surface hover:bg-surface-2 text-text",
  danger: "bg-danger text-white border-b-4 border-black/25 hover:opacity-90 dark:text-bg",
  ghost: "text-accent hover:bg-accent-soft",
};
export type ButtonVariant = keyof typeof BTN;
export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  cx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-extrabold transition active:translate-y-px active:border-b-2 disabled:cursor-not-allowed disabled:opacity-60",
    BTN[variant],
    className,
  );

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  "w-full min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-text placeholder:text-muted/70 focus:border-accent focus:outline-none";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, "min-h-24", props.className)} />;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[32rem] border-collapse text-sm [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted">
        {children}
      </table>
    </div>
  );
}
