"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { buttonClass, type ButtonVariant } from "./ui";

export function SubmitButton({
  children,
  pendingText = "Guardando…",
  variant = "primary",
  className,
  name,
  value,
  confirm,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  className?: string;
  name?: string;
  value?: string;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={buttonClass(variant, className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
