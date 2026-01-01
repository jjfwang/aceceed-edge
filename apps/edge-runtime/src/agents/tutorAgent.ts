import type { Agent, AgentInput, AgentOutput } from "./base.js";
import type { LlmClient } from "../llm/base.js";

function detectResponseLanguage(transcript: string): {
  label: string;
} | null {
  if (/[\u4E00-\u9FFF]/.test(transcript)) {
    return {
      label: "Simplified Chinese"
    };
  }
  if (/[\u3040-\u30FF]/.test(transcript)) {
    return {
      label: "Japanese"
    };
  }
  if (/[\uAC00-\uD7AF]/.test(transcript)) {
    return {
      label: "Korean"
    };
  }
  return null;
}

function stripLanguagePrefix(response: string): string {
  const trimmed = response.trim();
  const patterns = [
    /^here(?:'s| is)\s+(?:the\s+)?answer\s+in\s+\w+\s*[:：]\s*/i,
    /^answer\s*[:：]\s*/i,
    /^response\s*[:：]\s*/i,
    /^final\s*[:：]\s*/i,
    /^回复\s*[:：]\s*/i,
    /^回答\s*[:：]\s*/i,
    /^答复\s*[:：]\s*/i,
    /^答案\s*[:：]\s*/i,
    /^答\s*[:：]\s*/i
  ];
  for (const pattern of patterns) {
    if (pattern.test(trimmed)) {
      return trimmed.replace(pattern, "").trim();
    }
  }
  return trimmed;
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

    const response = await this.llm.generate([
      { role: "system", content: this.systemPrompt },
      ...(languageDirective ? [{ role: "system", content: languageDirective }] : []),
      { role: "user", content: input.transcript }
    ]);

    return { text: stripLanguagePrefix(response) };
  }
}
