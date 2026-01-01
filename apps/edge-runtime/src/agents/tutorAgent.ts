import type { Agent, AgentInput, AgentOutput } from "./base.js";
import type { LlmClient } from "../llm/base.js";

function detectResponseLanguage(transcript: string): string | null {
  if (/[\u4E00-\u9FFF]/.test(transcript)) {
    return "Simplified Chinese";
  }
  if (/[\u3040-\u30FF]/.test(transcript)) {
    return "Japanese";
  }
  if (/[\uAC00-\uD7AF]/.test(transcript)) {
    return "Korean";
  }
  return null;
}

export class TutorAgent implements Agent {
  id = "tutor";
  name = "Tutor";

  constructor(private llm: LlmClient, private systemPrompt: string) {}

  async handle(input: AgentInput): Promise<AgentOutput | null> {
    if (!input.transcript.trim()) {
      return null;
    }

    const languageHint = detectResponseLanguage(input.transcript);
    const languageDirective = languageHint
      ? `Respond only in ${languageHint}. Do not translate or switch languages.`
      : null;

    const response = await this.llm.generate([
      { role: "system", content: this.systemPrompt },
      ...(languageDirective ? [{ role: "system", content: languageDirective }] : []),
      { role: "user", content: input.transcript }
    ]);

    return { text: response };
  }
}
