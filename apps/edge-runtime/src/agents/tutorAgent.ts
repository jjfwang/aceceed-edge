import type { Agent, AgentInput, AgentOutput } from "./base.js";
import type { LlmClient } from "../llm/base.js";

function detectResponseLanguage(transcript: string): {
  label: string;
  userPrefix: string;
} | null {
  if (/[\u4E00-\u9FFF]/.test(transcript)) {
    return {
      label: "Simplified Chinese",
      userPrefix: "请用中文回答："
    };
  }
  if (/[\u3040-\u30FF]/.test(transcript)) {
    return {
      label: "Japanese",
      userPrefix: "日本語で答えてください："
    };
  }
  if (/[\uAC00-\uD7AF]/.test(transcript)) {
    return {
      label: "Korean",
      userPrefix: "한국어로 답해 주세요: "
    };
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
      ? `Respond only in ${languageHint.label}. Do not translate or switch languages.`
      : null;
    const userPrompt = languageHint
      ? `${languageHint.userPrefix}${input.transcript}`
      : input.transcript;

    const response = await this.llm.generate([
      { role: "system", content: this.systemPrompt },
      ...(languageDirective ? [{ role: "system", content: languageDirective }] : []),
      { role: "user", content: userPrompt }
    ]);

    return { text: response };
  }
}
