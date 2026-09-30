import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Snapshot } from "@/domain/snapshot";
import { anthropic, assertUsable, llmConfig, loadPrompt, LlmError, toLlmError } from "./client";

export const ReportContentSchema = z.object({
  headline: z.string(),
  worsened: z.array(z.string()),
  improved: z.array(z.string()),
  stable: z.array(z.string()),
  connections: z.string(),
  priorities: z
    .array(z.object({ title: z.string(), kind: z.enum(["must", "nice"]), why: z.string(), how: z.string() }))
    .min(1)
    .max(3),
  see_doctor: z.string(),
  closing: z.string(),
});
export type ReportContent = z.infer<typeof ReportContentSchema>;

/** Keeps the snapshot compact: history series are summarised by the trend already. */
export function snapshotForPrompt(s: Snapshot) {
  return {
    ...s,
    markers: s.markers.map(({ history, ...m }) => ({ ...m, points: history.length })),
  };
}

export async function generateReport(snapshot: Snapshot): Promise<{ content: ReportContent; promptVersion: string; model: string }> {
  const prompt = await loadPrompt("report", 1);
  const model = llmConfig.model();
  try {
    const msg = await anthropic().beta.messages.parse({
      model,
      max_tokens: 16000,
      betas: llmConfig.betas,
      fallbacks: "default",
      system: prompt.text,
      output_config: { effort: llmConfig.effort(), format: betaZodOutputFormat(ReportContentSchema) },
      messages: [{ role: "user", content: `<snapshot>\n${JSON.stringify(snapshotForPrompt(snapshot), null, 1)}\n</snapshot>` }],
    });
    assertUsable(msg);
    if (!msg.parsed_output) throw new LlmError("El informe no cumplió el esquema.", true);
    return { content: msg.parsed_output, promptVersion: prompt.version, model: msg.model ?? model };
  } catch (e) {
    throw toLlmError(e);
  }
}
