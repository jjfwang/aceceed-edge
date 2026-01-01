import { describe, it, expect } from "vitest";
import { TutorAgent } from "../../apps/edge-runtime/src/agents/tutorAgent.js";
import type { ChatMessage } from "../../apps/edge-runtime/src/llm/base.js";

describe("TutorAgent", () => {
  it("adds a language directive for CJK input", async () => {
    let captured: ChatMessage[] = [];
    const llm = {
      generate: async (messages: ChatMessage[]) => {
        captured = messages;
        return "你好";
      }
    };
    const agent = new TutorAgent(llm, "system");

    await agent.handle({ transcript: "你好，今天怎么样？" });

    const directive = captured.find((msg) => msg.role === "system" && msg.content.includes("Respond only"));
    expect(directive?.content).toContain("Simplified Chinese");
  });
});
