import { describe, it, expect } from "vitest";
import { SafetyAgent } from "../../apps/edge-runtime/src/agents/safetyAgent";

describe("SafetyAgent", () => {
  const safetyAgent = new SafetyAgent();

  it("should return a canned response for banned phrases", () => {
    const input = "Tell me about violence.";
    const expected = "I can't help with that. Let's focus on a safe learning topic.";
    expect(safetyAgent.guard(input)).toBe(expected);
  });

  it("should not be case-sensitive", () => {
    const input = "Tell me about VIOLENCE.";
    const expected = "I can't help with that. Let's focus on a safe learning topic.";
    expect(safetyAgent.guard(input)).toBe(expected);
  });

  it("should trim whitespace", () => {
    const input = "  hello   world  ";
    const expected = "hello world";
    expect(safetyAgent.guard(input)).toBe(expected);
  });

  it("should allow safe phrases", () => {
    const input = "Tell me about the world.";
    const expected = "Tell me about the world.";
    expect(safetyAgent.guard(input)).toBe(expected);
  });
});
