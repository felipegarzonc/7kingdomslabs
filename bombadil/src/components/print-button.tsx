"use client";
import { buttonClass } from "./ui";

export function PrintButton({ children = "Imprimir o guardar PDF" }: { children?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("primary", "print:hidden")}>
      {children}
    </button>
  );
}
