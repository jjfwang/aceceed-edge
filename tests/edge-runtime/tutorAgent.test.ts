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

  it("strips common language prefixes from responses", async () => {
    const llm = {
      generate: async () => "回答：这是测试"
    };
    const agent = new TutorAgent(llm, "system");

    const result = await agent.handle({ transcript: "你好" });

    expect(result?.text).toBe("这是测试");
  });

  it("retries with translation when response language mismatches", async () => {
    const responses = ["This is English.", "这是中文。"];
    let calls = 0;
    const llm = {
      generate: async () => {
        const reply = responses[calls] ?? "这是中文。";
        calls += 1;
        return reply;
      }
    };
    const agent = new TutorAgent(llm, "system");

    const result = await agent.handle({ transcript: "你好" });

    expect(calls).toBe(2);
    expect(result?.text).toBe("这是中文。");
  });
});
