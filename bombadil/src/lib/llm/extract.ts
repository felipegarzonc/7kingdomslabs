import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { BIOMARKERS } from "@/domain/biomarkers";
import { anthropic, assertUsable, llmConfig, loadPrompt, LlmError, toLlmError } from "./client";

export const ExtractionSchema = z.object({
  lab_name: z.string().nullable(),
  sampled_on: z.string().nullable(),
  results: z.array(
    z.object({
      name_as_printed: z.string(),
      biomarker_code: z.string().nullable(),
      value: z.number(),
      qualifier: z.enum(["<", ">"]).nullable(),
      unit: z.string().nullable(),
      ref_low: z.number().nullable(),
      ref_high: z.number().nullable(),
      section: z.string().nullable(),
    }),
  ),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

export interface ExtractionOutput {
  extraction: Extraction;
  promptVersion: string;
  model: string;
}

/** Text (already PII-redacted) → structured lab results. Never sees the raw PDF. */
export async function extractLabResults(redactedText: string): Promise<ExtractionOutput> {
  const prompt = await loadPrompt("extract-labs", 1);
  const list = BIOMARKERS.map((b) => `    - ${b.code}: ${b.name} (${b.unit})`).join("\n");
  const system = prompt.text.replace("{{BIOMARKER_LIST}}", list);
  const model = llmConfig.model();
  try {
    const msg = await anthropic().beta.messages.parse({
      model,
      max_tokens: 16000,
      betas: llmConfig.betas,
      fallbacks: "default",
      system,
      output_config: { effort: llmConfig.effort(), format: betaZodOutputFormat(ExtractionSchema) },
      messages: [{ role: "user", content: `<informe>\n${redactedText}\n</informe>` }],
    });
    assertUsable(msg);
    if (!msg.parsed_output) throw new LlmError("La extracción no cumplió el esquema.", true);
    // Drop codes the model invented that are not in the catalog.
    const known = new Set(BIOMARKERS.map((b) => b.code));
    const extraction = {
      ...msg.parsed_output,
      results: msg.parsed_output.results.map((r) => ({ ...r, biomarker_code: r.biomarker_code && known.has(r.biomarker_code) ? r.biomarker_code : null })),
    };
    return { extraction, promptVersion: prompt.version, model: msg.model ?? model };
  } catch (e) {
    throw toLlmError(e);
  }
}
