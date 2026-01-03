import type { Logger } from "pino";
import type { Agent, AgentInput, AgentOutput, LlmMessage } from "./base.js";
import type { LlmClient } from "../llm/base.js";

function detectResponseLanguage(transcript: string): {
  label: string;
} | null {
  if (/[一-鿿]/.test(transcript)) {
    return {
      label: "Simplified Chinese"
    };
  }
  // Add other language detections if necessary
  return null;
}

function stripLanguagePrefix(response: string): string {
  const trimmed = response.trim();
  const patterns = [
    /^here(?:'s| is)\s+(?:the\s+)?answer\s+in\s+\w+\s*[:：]\s*/i,
    /^(answer|response|final|回复|回答|答复|答案|答)\s*[:：]\s*/i,
  ];
  for (const pattern of patterns) {
    if (pattern.test(trimmed)) {
      return trimmed.replace(pattern, "").trim();
    }
  }
  return trimmed;
}

function responseMatchesLanguage(response: string, language: string): boolean {
  if (language === "Simplified Chinese") {
    return /[一-鿿]/.test(response);
  }
  return true;
}

function buildTranslationMessages(text: string, language: string): LlmMessage[] {
  return [
    {
      role: "system",
      content: `Translate the text into ${language}. Output only the translation.`
    },
    { role: "user", content: text }
  ];
}

function buildUserPrompt(input: AgentInput): string {
  const lines: string[] = [];

  // The student's primary question from their voice
  lines.push("A student asks:");
  lines.push(`"${input.transcript}"`);
  lines.push("\n---");

  // Include the context from the RAG system
  if (input.ragChunks && input.ragChunks.length > 0) {
    lines.push("Syllabus Context:");
    for (const chunk of input.ragChunks) {
      const sourceLabel = chunk.source ? ` (source: ${chunk.source})` : "";
      const sourceType = chunk.sourceType ? `[${chunk.sourceType}] ` : "";
      lines.push(`- ${sourceType}${chunk.subject}/${chunk.topic}: ${chunk.content}${sourceLabel}`);
    }
  } else {
    lines.push("Syllabus Context:\n- None provided.");
  }
  lines.push("---");

  // Include the text recognized from the student's written work
  if (input.ocrText) {
    lines.push("Student's Work (OCR):");
    lines.push(input.ocrText);
  } else {
    lines.push("Student's Work (OCR):\n- None provided.");
  }
  lines.push("---");
  
  lines.push("\nBased on all the information above, please provide your response.");

  return lines.join("\n");
}


export class TutorAgent implements Agent {
  id = "tutor";
  name = "Tutor";

  constructor(
    private llm: LlmClient,
    private systemPrompt: string, // This will be the content of tutorPrompt.txt
    private logger?: Logger
  ) {}

  async handle(input: AgentInput): Promise<AgentOutput | null> {
    if (!input.transcript.trim() && !input.ocrText?.trim()) {
      this.logger?.info("Tutor agent received no transcript or OCR text. Skipping.");
      return null;
    }

    const languageHint = detectResponseLanguage(input.transcript);
    
    // The system prompt is now the dedicated tutor prompt, with an added language instruction if needed.
    const systemMessage = [
      this.systemPrompt,
      languageHint ? `Respond only in ${languageHint.label}.` : ""
    ].filter(Boolean).join("\n");
    
    // The user message is a structured block containing the transcript, RAG context, and OCR text.
    const userMessage = buildUserPrompt(input);

    const messages: LlmMessage[] = [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ];

    if (this.logger) {
      this.logger.info({ messages }, "LLM request");
    }

    const response = await this.llm.generate(messages);

    if (this.logger) {
      this.logger.info({ response }, "LLM response");
    }

    let finalResponse = response;
    // Fallback translation if the model fails to follow language instructions
    if (languageHint && !responseMatchesLanguage(response, languageHint.label)) {
      if (this.logger) {
        this.logger.warn(
          { target: languageHint.label },
          "LLM response language mismatch, attempting fallback translation."
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