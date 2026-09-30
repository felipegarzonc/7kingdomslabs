import { Notice } from "./ui";

export type FormState = { ok?: boolean; error?: string; message?: string } | null;

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) return <Notice tone="danger">{state.error}</Notice>;
  if (state.message) return <Notice tone="good">{state.message}</Notice>;
  return null;
}
