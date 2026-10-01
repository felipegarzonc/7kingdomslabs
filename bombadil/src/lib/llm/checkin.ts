import "server-only";
import { anthropic, assertUsable, llmConfig, loadPrompt, LlmError, toLlmError } from "./client";

export interface CheckinReplyInput {
  week: number;
  priorities: string[];
  adherence: Array<{ priority: string; status: string }>;
  measurements: Array<{ label: string; value: number; unit: string }>;
  goals: Array<{ label: string; status: string; current: number | null; target: number }>;
  alerts: Array<{ level: string; message: string }>;
  freeText: string | null;
  habits: Array<{ title: string; done_this_week: number; target_per_week: number; streak: { value: number; unit: string }; next_step: string | null; tiny: string | null }>;
}

export async function generateCheckinReply(input: CheckinReplyInput): Promise<{ text: string; promptVersion: string; model: string }> {
  const prompt = await loadPrompt("checkin-reply", 3);
  const model = llmConfig.model();
  try {
    const msg = await anthropic().beta.messages.create({
      model,
      max_tokens: 4000,
      betas: llmConfig.betas,
      fallbacks: "default",
      system: prompt.text,
      // Short conversational reply: low effort keeps it fast and cheap.
      output_config: { effort: "low" },
      messages: [{ role: "user", content: `<checkin>\n${JSON.stringify(input, null, 1)}\n</checkin>` }],
    });
    assertUsable(msg);
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) throw new LlmError("Respuesta vacía del modelo.", true);
    return { text, promptVersion: prompt.version, model: msg.model ?? model };
  } catch (e) {
    throw toLlmError(e);
  }
}
