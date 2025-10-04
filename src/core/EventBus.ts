export type EventHandler<T = unknown> = (payload: T) => void;

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  on<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as EventHandler);
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.handlers.get(event)?.delete(handler as EventHandler);
  }

  emit<T = unknown>(event: string, payload: T): void {
    this.handlers.get(event)?.forEach((h) => {
      try {
        h(payload);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('EventBus handler error', e);
      }
    });
  }

  clear(): void {
    this.handlers.clear();
  }
}
