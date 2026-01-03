import { EventEmitter } from "node:events";
import type { AppEvent } from "./state.js";

export class EventBus extends EventEmitter {
  publish(event: AppEvent): void {
    this.emit("event", event);
  }

  subscribe(handler: (event: AppEvent) => void): void {
    this.on("event", handler);
  }
}
