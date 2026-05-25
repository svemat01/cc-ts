/**
 * @module EventEmitter
 *
 * 🎭 A strongly-typed event emitter for ComputerCraft - because even computers
 * need to express their feelings! Perfect for when you need to shout events
 * across your codebase with style.
 *
 * Key Features:
 * - 🎯 Full TypeScript support with type-safe events
 * - 🔄 Subscribe and unsubscribe with ease
 * - 🎪 Support for one-time event listeners
 * - 🧹 Clean up capabilities to prevent memory leaks
 *
 * @example
 * ```ts
 * // Define your event types
 * interface MyEvents {
 *   'turtle:moved': [x: number, y: number];
 *   'inventory:full': [];
 *   'fuel:low': [remainingFuel: number];
 * }
 *
 * // Create your emitter
 * const events = new EventEmitter<MyEvents>();
 *
 * // Listen for events
 * events.on('turtle:moved', (x, y) => {
 *   print(`Turtle moved to ${x}, ${y}`);
 * });
 *
 * // Emit events with type safety!
 * events.emit('turtle:moved', 42, 73);  // Works! ✨
 * events.emit('turtle:moved', "oops");  // Type error! 🚫
 * ```
 *
 * Common Use Cases:
 * - Building reactive user interfaces
 * - Managing turtle state changes
 * - Coordinating multiple computers
 * - Implementing pub/sub patterns
 *
 * @typeParam Events - A record of event names mapped to their argument types
 */

export type EventMap = Record<string, any[]>;

/**
 * 🎭 The main EventEmitter class that handles all your event needs!
 *
 * @typeParam Events - A record type mapping event names to arrays of argument types
 *
 * @example
 * ```ts
 * // Create a type-safe redstone event system
 * interface RedstoneEvents {
 *   'pulse': [side: string, strength: number];
 *   'off': [side: string];
 * }
 *
 * const redstone = new EventEmitter<RedstoneEvents>();
 *
 * // Type-safe event handling
 * redstone.on('pulse', (side, strength) => {
 *   print(`Redstone signal on ${side}: ${strength}`);
 * });
 *
 * // Clean up when done
 * const cleanup = redstone.on('off', (side) => {
 *   print(`Signal lost on ${side}`);
 * });
 *
 * // Later...
 * cleanup(); // Removes the listener
 * ```
 */
export class EventEmitter<Events extends EventMap = EventMap> {
    private _events: LuaMap<keyof Events, LuaSet<(...args: any[]) => void>> =
        new LuaMap();

    /**
     * Subscribe to an event with a listener function.
     *
     * @param event - The event name to listen for
     * @param listener - The callback function that handles the event
     * @returns A cleanup function that removes the listener when called
     *
     * @example
     * ```ts
     * const cleanup = emitter.on('inventory:changed', (slot, count) => {
     *   print(`Slot ${slot} now has ${count} items`);
     * });
     *
     * // Later when you're done listening:
     * cleanup();
     * ```
     */
    public on<K extends keyof Events>(
        event: K,
        listener: (...args: Events[K]) => void
    ): () => void {
        if (!this._events.has(event)) {
            this._events.set(event, new LuaSet());
        }
        this._events.get(event)!.add(listener);

        return () => this.off(event, listener);
    }

    /**
     * Subscribe to an event that automatically unsubscribes after first trigger.
     *
     * @param event - The event name to listen for
     * @param listener - The one-time callback function
     * @returns A cleanup function (in case you need to remove before trigger)
     *
     * @example
     * ```ts
     * // Perfect for initialization events
     * emitter.once('system:ready', () => {
     *   print('System initialized!');
     * });
     * ```
     */
    public once<K extends keyof Events>(
        event: K,
        listener: (...args: Events[K]) => void
    ): () => void {
        const wrapper = (...args: Events[K]) => {
            this.off(event, wrapper);
            listener(...args);
        };
        return this.on(event, wrapper);
    }

    /**
     * Unsubscribe a listener from an event.
     *
     * @param event - The event name to unsubscribe from
     * @param listener - The callback function to remove
     */
    public off<K extends keyof Events>(
        event: K,
        listener: (...args: Events[K]) => void
    ): void {
        const listeners = this._events.get(event);
        if (!listeners) return;
        listeners.delete(listener);
        if (listeners.isEmpty()) {
            this._events.delete(event);
        }
    }

    /**
     * Emit an event with arguments.
     *
     * @param event - The event name to emit
     * @param args - The arguments to pass to listeners
     *
     * @example
     * ```ts
     * // Emit events with type safety
     * emitter.emit('turtle:error', new Error('Out of fuel!'));
     * ```
     */
    public emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
        const listeners = this._events.get(event);
        if (!listeners) return;
        for (const listener of listeners) {
            listener(...args);
        }
    }

    /**
     * Remove all listeners for an event, or all events if no event specified.
     *
     * @param event - Optional event name to clear listeners for
     *
     * @example
     * ```ts
     * // Clear specific event
     * emitter.removeAllListeners('user:input');
     *
     * // Clear everything
     * emitter.removeAllListeners();
     * ```
     */
    public removeAllListeners(event?: keyof Events): void {
        if (event) {
            this._events.delete(event);
        } else {
            for (const [event] of this._events) {
                this._events.delete(event);
            }
        }
    }
}
