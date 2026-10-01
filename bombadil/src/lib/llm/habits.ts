import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { PILLARS } from "@/domain/habits";
import { anthropic, assertUsable, llmConfig, loadPrompt, LlmError, toLlmError } from "./client";

export const HabitPlanSchema = z.object({
  message: z.string(),
  habits: z
    .array(
      z.object({
        pillar: z.enum(PILLARS),
        title: z.string(),
        tiny: z.string(),
        anchor: z.string(),
        why: z.string(),
        next_step: z.string(),
        target_per_week: z.number().int().min(1).max(7),
      }),
    )
    .min(1)
    .max(5),
});
export type HabitPlan = z.infer<typeof HabitPlanSchema>;

export interface HabitPlanInput {
  meta: string | null;
  perfil: { edad: number | null; sexo: string; fuma: string | null };
  estilo_de_vida: Record<string, string>;
  enfoque: string[];
  hallazgos: unknown;
  habitos_actuales: string[];
}

export async function generateHabitPlan(input: HabitPlanInput): Promise<{ plan: HabitPlan; promptVersion: string; model: string }> {
  const prompt = await loadPrompt("habit-plan", 1);
  const model = llmConfig.model();
  try {
    const msg = await anthropic().beta.messages.parse({
      model,
      max_tokens: 8000,
      betas: llmConfig.betas,
      fallbacks: "default",
      system: prompt.text,
      output_config: { effort: "medium", format: betaZodOutputFormat(HabitPlanSchema) },
      messages: [{ role: "user", content: `<persona>\n${JSON.stringify(input, null, 1)}\n</persona>` }],
    });
    assertUsable(msg);
    if (!msg.parsed_output) throw new LlmError("El plan de hábitos no cumplió el esquema.", true);
    return { plan: msg.parsed_output, promptVersion: prompt.version, model: msg.model ?? model };
  } catch (e) {
    throw toLlmError(e);
  }
}
