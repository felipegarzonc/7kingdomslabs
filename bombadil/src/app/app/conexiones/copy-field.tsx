"use client";
import { useState } from "react";
import { buttonClass } from "@/components/ui";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 font-mono text-xs" />
      <button
        type="button"
        className={buttonClass("secondary")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // The field is selectable as a fallback.
          }
        }}
      >
        {copied ? "Copiado ✓" : "Copiar"}
      </button>
    </div>
  );
}
