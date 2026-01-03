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
  ].filter(Boolean).join("\n");
}

function responseMatchesLanguage(response: string, language: string): boolean {
  if (language === "Simplified Chinese") {
    return /[\u4E00-\u9FFF]/.test(response);
  }
  if (language === "Japanese") {
    return /[\u3040-\u30FF]/.test(response);
  }
  if (language === "Korean") {
    return /[\uAC00-\uD7AF]/.test(response);
  }
  return true;
}

function buildTranslationMessages(text: string, language: string) {
  return [
    {
      role: "system" as const,
      content: `Translate the text into ${language}. Output only the translation.`
    },
    { role: "user" as const, content: text }
  ];
}

function buildCurriculumContext(input: AgentInput): string | null {
  const lines: string[] = [];

  if (input.gradeBand) {
    lines.push(`You are helping a Singapore ${input.gradeBand} student.`);
  }
  if (input.subjects && input.subjects.length > 0) {
    lines.push(`The focus subjects are: ${input.subjects.join(", ")}.`);
  }

  if (input.ragChunks && input.ragChunks.length > 0) {
    lines.push("Use the following syllabus-aligned references first:");
    for (const chunk of input.ragChunks) {
      const sourceLabel = chunk.source ? ` (source: ${chunk.source})` : "";
      const sourceType = chunk.sourceType ? `[${chunk.sourceType}] ` : "";
      lines.push(`- ${sourceType}${chunk.subject}/${chunk.topic}: ${chunk.content}${sourceLabel}`);
    }
  }

  if (input.ocrText) {
    lines.push(`Student work (OCR): ${input.ocrText}`);
  }

  if (!lines.length) {
    return null;
  }

  return lines.join("\n");
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
    const curriculumContext = buildCurriculumContext(input);

    const messages = [
      { role: "system", content: finalPrompt },
      ...(curriculumContext ? [{ role: "system" as const, content: curriculumContext }] : []),
      { role: "user", content: input.transcript }
    ];

    if (this.logger) {
      this.logger.info({ messages }, "LLM request");
    }

    const response = await this.llm.generate(messages);

    if (this.logger) {
      this.logger.info({ response }, "LLM response");
    }

    let finalResponse = response;
    if (languageHint && !responseMatchesLanguage(response, languageHint.label)) {
      if (this.logger) {
        this.logger.info(
          { target: languageHint.label },
          "LLM response language mismatch, retrying with translation"
        );
      }
      const translated = await this.llm.generate(
        buildTranslationMessages(response, languageHint.label)
      );
      if (responseMatchesLanguage(translated, languageHint.label)) {
        finalResponse = translated;
      }
    }

    return { text: stripLanguagePrefix(finalResponse) };
  }
}
