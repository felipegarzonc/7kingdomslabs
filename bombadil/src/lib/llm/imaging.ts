import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FINDING_RELEVANCE, IMAGING_MODALITIES } from "@/domain/imaging";
import { anthropic, assertUsable, llmConfig, loadPrompt, LlmError, toLlmError } from "./client";

export const ImagingSchema = z.object({
  is_imaging_report: z.boolean(),
  modality: z.enum(IMAGING_MODALITIES).nullable(),
  body_region: z.string().nullable(),
  study_date: z.string().nullable(),
  summary: z.string(),
  findings: z.array(z.object({ finding: z.string(), explanation: z.string(), relevance: z.enum(FINDING_RELEVANCE) })),
  impression: z.string().nullable(),
  questions_for_doctor: z.array(z.string()),
});
export type ImagingInterpretation = z.infer<typeof ImagingSchema>;

/** Stored in lab_documents.imaging, with provenance like every LLM output. */
export type StoredImaging = ImagingInterpretation & { prompt_version: string; model: string };

/** Text (already PII-redacted) → plain-language interpretation of a radiology report. */
export async function interpretImaging(redactedText: string): Promise<StoredImaging> {
  const prompt = await loadPrompt("interpret-imaging", 1);
  const model = llmConfig.model();
  try {
    const msg = await anthropic().beta.messages.parse({
      model,
      max_tokens: 16000,
      betas: llmConfig.betas,
      fallbacks: "default",
      system: prompt.text,
      output_config: { effort: llmConfig.effort(), format: betaZodOutputFormat(ImagingSchema) },
      messages: [{ role: "user", content: `<informe>\n${redactedText}\n</informe>` }],
    });
    assertUsable(msg);
    if (!msg.parsed_output) throw new LlmError("La interpretación no cumplió el esquema.", true);
    return { ...msg.parsed_output, prompt_version: prompt.version, model: msg.model ?? model };
  } catch (e) {
    throw toLlmError(e);
  }
}
