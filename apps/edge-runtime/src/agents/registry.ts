import type { Agent } from "./base.js";

export class AgentRegistry {
  private agents = new Map<string, Agent>();
  private enabled = new Set<string>();

  constructor(agents: Agent[], enabledIds: string[]) {
    for (const agent of agents) {
      this.agents.set(agent.id, agent);
    }
    for (const id of enabledIds) {
      this.enabled.add(id);
    }
  }

  get(id: string): Agent | null {
    if (!this.enabled.has(id)) {
      return null;
    }
    return this.agents.get(id) ?? null;
  }

  list(): Agent[] {
    return Array.from(this.agents.values());
  }
}
