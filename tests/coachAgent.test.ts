import { describe, it, expect } from "vitest";
import { CoachAgent } from "../apps/src/agents/coachAgent.js";
import type { ChatMessage } from "../apps/src/llm/base.js";

describe("CoachAgent", () => {
  it("adds a language directive for CJK input", async () => {
    let captured: ChatMessage[] = [];
    const llm = {
      generate: async (messages: ChatMessage[]) => {
        captured = messages;
        return "你好";
      }
    };
    const agent = new CoachAgent(llm, "coach system");

    await agent.handle({ transcript: "你好，能帮我安排学习吗？" });

    const directive = captured.find((msg) => msg.role === "system" && msg.content.includes("Respond only"));
    expect(directive?.content).toContain("Simplified Chinese");
  });

  it("strips common response prefixes", async () => {
    const llm = {
      generate: async () => "Answer: Start with a schedule"
    };
    const agent = new CoachAgent(llm, "coach system");

    const result = await agent.handle({ transcript: "I need a plan" });

    expect(result?.text).toBe("Start with a schedule");
  });
});
