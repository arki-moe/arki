import { Event } from './Event.js';

/** Event class constructor type */
type EventClass<T extends Event> = new (...args: never[]) => T;

/** Event callback type */
type EventCallback<T extends Event> = (event: T) => void;

/**
 * EventBus singleton for Agent event pub/sub
 * Key format: `${EventClassName}.${agentName}` or `${EventClassName}.*` (wildcard)
 */
class EventBus {
  private subscriptions: Map<string, EventCallback<Event>[]> = new Map();

  /**
   * Generate subscription key
   */
  private getKey<T extends Event>(eventClass: EventClass<T>, agentName: string): string {
    return `${eventClass.name}.${agentName}`;
  }

  /**
   * Subscribe to events
   * @param eventClass Event class to subscribe
   * @param agentName Agent name to filter, or '*' for all agents
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  subscribe<T extends Event>(
    eventClass: EventClass<T>,
    agentName: string,
    callback: EventCallback<T>
  ): () => void {
    const key = this.getKey(eventClass, agentName);

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, []);
    }
    this.subscriptions.get(key)!.push(callback as EventCallback<Event>);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(key);
      if (subs) {
        const index = subs.indexOf(callback as EventCallback<Event>);
        if (index > -1) {
          subs.splice(index, 1);
        }
        if (subs.length === 0) {
          this.subscriptions.delete(key);
        }
      }
    };
  }

  /**
   * Publish event
   * Notifies both specific agent subscribers and wildcard subscribers
   */
  publish<T extends Event>(event: T): void {
    const eventClass = event.constructor as EventClass<T>;

    // Notify specific agent subscribers
    const specificKey = this.getKey(eventClass, event.agentName);
    const specificSubs = this.subscriptions.get(specificKey);
    if (specificSubs) {
      for (const callback of specificSubs) {
        callback(event);
      }
    }

    // Notify wildcard subscribers
    const wildcardKey = this.getKey(eventClass, '*');
    const wildcardSubs = this.subscriptions.get(wildcardKey);
    if (wildcardSubs) {
      for (const callback of wildcardSubs) {
        callback(event);
      }
    }
  }

  /**
   * Clear all subscriptions (for testing)
   */
  clear(): void {
    this.subscriptions.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();

/**
 * Subscribe to events for a specific agent or all agents
 */
export function subscribe<T extends Event>(
  eventClass: EventClass<T>,
  agentName: string,
  callback: (event: T) => void
): () => void {
  return eventBus.subscribe(eventClass, agentName, callback);
}

/**
 * Publish an event
 */
export function publish<T extends Event>(event: T): void {
  eventBus.publish(event);
}
