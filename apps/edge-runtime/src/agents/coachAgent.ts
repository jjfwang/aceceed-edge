import type { Logger } from "pino";
import type { Agent, AgentInput, AgentOutput } from "./base.js";
import type { LlmClient } from "../llm/base.js";

function detectResponseLanguage(transcript: string): { label: string } | null {
  if (/[\u4E00-\u9FFF]/.test(transcript)) {
    return { label: "Simplified Chinese" };
  }
  if (/[\u3040-\u30FF]/.test(transcript)) {
    return { label: "Japanese" };
  }
  if (/[\uAC00-\uD7AF]/.test(transcript)) {
    return { label: "Korean" };
  }
  return null;
}

function stripLanguagePrefix(response: string): string {
  const trimmed = response.trim();
  const patterns = [/^answer\s*[:：]\s*/i, /^response\s*[:：]\s*/i, /^final\s*[:：]\s*/i];
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
  ].filter(Boolean).join("\n");
}

export class CoachAgent implements Agent {
  id = "coach";
  name = "Coach";

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
      this.logger.info({ messages }, "Coach LLM request");
    }

    const response = await this.llm.generate(messages);

    if (this.logger) {
      this.logger.info({ response }, "Coach LLM response");
    }

    return { text: stripLanguagePrefix(response) };
  }
}
