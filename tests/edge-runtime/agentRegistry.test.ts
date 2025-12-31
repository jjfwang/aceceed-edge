import { describe, it, expect } from "vitest";
import { AgentRegistry } from "../../apps/edge-runtime/src/agents/registry.js";
import type { Agent } from "../../apps/edge-runtime/src/agents/base.js";

const mockAgent = (id: string): Agent => ({
  id,
  name: id,
  handle: async () => ({ text: id })
});

describe("AgentRegistry", () => {
  it("returns enabled agents only", () => {
    const registry = new AgentRegistry([mockAgent("tutor"), mockAgent("coach")], ["tutor"]);

    expect(registry.get("tutor")?.id).toBe("tutor");
    expect(registry.get("coach")).toBeNull();
  });
});
