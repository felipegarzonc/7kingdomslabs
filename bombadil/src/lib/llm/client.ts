import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  client ??= new Anthropic({ timeout: 5 * 60 * 1000, maxRetries: 2 });
  return client;
}

export interface LoadedPrompt {
  /** e.g. "extract-labs@v1" — stored with every LLM output. */
  version: string;
  text: string;
}

/** Loads a versioned prompt from /prompts, e.g. loadPrompt("report", 1). */
export async function loadPrompt(name: string, version: number): Promise<LoadedPrompt> {
  const file = path.join(process.cwd(), "prompts", `${name}.v${version}.md`);
  return { version: `${name}@v${version}`, text: await readFile(file, "utf8") };
}

export const llmConfig = {
  model: () => env.anthropicModel(),
  effort: () => env.anthropicEffort(),
  /** Server-side refusal fallback routing (beta). */
  betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
};

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/** Maps SDK errors to a message the operator can act on. */
export function toLlmError(e: unknown): LlmError {
  if (e instanceof LlmError) return e;
  if (e instanceof Anthropic.AuthenticationError) return new LlmError("ANTHROPIC_API_KEY inválida o ausente.", false);
  if (e instanceof Anthropic.BadRequestError) return new LlmError(`Solicitud inválida al modelo: ${e.message}`, false);
  if (e instanceof Anthropic.RateLimitError) return new LlmError("Límite de uso de la API alcanzado. Intenta en unos minutos.", true);
  if (e instanceof Anthropic.APIConnectionError) return new LlmError("No se pudo conectar con la API de Anthropic.", true);
  if (e instanceof Anthropic.APIError) return new LlmError(`Error de la API (${e.status}): ${e.message}`, true);
  return new LlmError(e instanceof Error ? e.message : String(e), false);
}

/** Guards shared by every call: refusals and truncation are errors, not data. */
export function assertUsable(msg: { stop_reason: string | null }) {
  if (msg.stop_reason === "refusal") throw new LlmError("El modelo declinó la solicitud.", false);
  if (msg.stop_reason === "max_tokens") throw new LlmError("La respuesta del modelo quedó truncada.", true);
}
