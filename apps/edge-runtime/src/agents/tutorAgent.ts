import type { Logger } from "pino";
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

function buildSystemPrompt(base: string, language: string | null): string {
  if (!language) {
    return base;
  }
  return [
    base,
    `Respond only in ${language}. Do not translate or switch languages.`,
    "Do not add prefatory labels like 'Answer:' or language names."
  ].join("\n");
}

export class TutorAgent implements Agent {
  id = "tutor";
  name = "Tutor";

  constructor(
    private llm: LlmClient,
    private systemPrompt: string,
    private logger?: Logger
  ) {}

  async handle(input: AgentInput): Promise<AgentOutput | null> {
    if (!input.transcript.trim()) {
      return null;
    }

    const languageHint = detectResponseLanguage(input.transcript);
    const finalPrompt = buildSystemPrompt(this.systemPrompt, languageHint?.label ?? null);

    const messages = [
      { role: "system", content: finalPrompt },
      { role: "user", content: input.transcript }
    ];

    if (this.logger) {
      this.logger.info({ messages }, "LLM request");
    }

    const response = await this.llm.generate(messages);

    if (this.logger) {
      this.logger.info({ response }, "LLM response");
    }

    return { text: stripLanguagePrefix(response) };
  }
}
