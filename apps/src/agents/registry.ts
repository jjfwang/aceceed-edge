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

  listEnabled(): Agent[] {
    const enabled: Agent[] = [];
    for (const id of this.enabled) {
      const agent = this.agents.get(id);
      if (agent) {
        enabled.push(agent);
      }
    }
    return enabled;
  }

  firstEnabled(): Agent | null {
    return this.listEnabled()[0] ?? null;
  }
}
