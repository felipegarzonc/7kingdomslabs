import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Snapshot } from "@/domain/snapshot";
import { anthropic, assertUsable, llmConfig, loadPrompt, LlmError, toLlmError } from "./client";

const PrioritySchema = z.object({
  title: z.string(),
  kind: z.enum(["must", "nice"]),
  why: z.string(),
  how: z.string(),
  /** Concrete actions for this week (report@v3+). */
  steps: z.array(z.string()).optional(),
  /** How the participant will know it is working (report@v3+). */
  track: z.string().optional(),
});

/** Stored report content. New fields are optional so earlier reports still render and validate. */
export const ReportContentSchema = z.object({
  headline: z.string(),
  worsened: z.array(z.string()),
  improved: z.array(z.string()),
  stable: z.array(z.string()),
  connections: z.string(),
  priorities: z.array(PrioritySchema).min(1).max(3),
  /** Small, easy suggestions beyond the priorities (report@v3+). */
  quick_wins: z.array(z.string()).optional(),
  see_doctor: z.string(),
  closing: z.string(),
});
export type ReportContent = z.infer<typeof ReportContentSchema>;

/** What the model must produce: every actionable field is required. */
const ReportLlmSchema = ReportContentSchema.extend({
  priorities: z.array(PrioritySchema.extend({ steps: z.array(z.string()), track: z.string() })).min(1).max(3),
  quick_wins: z.array(z.string()),
});

/** An interpreted imaging report, summarised for the report prompt. */
export interface ImagingForReport {
  date: string | null;
  study: string;
  summary: string;
  impression: string | null;
  notable_findings: string[];
}

/** Keeps the snapshot compact: history series are summarised by the trend already. */
export function snapshotForPrompt(s: Snapshot) {
  return {
    ...s,
    markers: s.markers.map(({ history, ...m }) => ({ ...m, points: history.length })),
  };
}

export async function generateReport(snapshot: Snapshot, imaging: ImagingForReport[] = []): Promise<{ content: ReportContent; promptVersion: string; model: string }> {
  const prompt = await loadPrompt("report", 3);
  const model = llmConfig.model();
  try {
    const msg = await anthropic().beta.messages.parse({
      model,
      max_tokens: 16000,
      betas: llmConfig.betas,
      fallbacks: "default",
      system: prompt.text,
      output_config: { effort: llmConfig.effort(), format: betaZodOutputFormat(ReportLlmSchema) },
      messages: [
        {
          role: "user",
          content: `<snapshot>\n${JSON.stringify(snapshotForPrompt(snapshot), null, 1)}\n</snapshot>\n<imagenes>\n${JSON.stringify(imaging, null, 1)}\n</imagenes>`,
        },
      ],
    });
    assertUsable(msg);
    if (!msg.parsed_output) throw new LlmError("El informe no cumplió el esquema.", true);
    return { content: msg.parsed_output, promptVersion: prompt.version, model: msg.model ?? model };
  } catch (e) {
    throw toLlmError(e);
  }
}
