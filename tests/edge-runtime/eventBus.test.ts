import { describe, it, expect } from "vitest";
import { EventBus } from "../../apps/edge-runtime/src/runtime/eventBus.js";

describe("EventBus", () => {
  it("publishes events to subscribers", () => {
    const bus = new EventBus();
    const events: string[] = [];

    bus.subscribe((event) => {
      events.push(event.type);
    });

    bus.publish({ type: "ptt:start", source: "system" });

    expect(events).toEqual(["ptt:start"]);
  });
});
