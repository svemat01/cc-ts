/**
 * The scheduler module provides a robust event management system for ComputerCraft applications.
 * It includes utilities for handling events, managing timeouts, and running event loops.
 *
 * ⚠️ IMPORTANT: Many functions in this module (osEvents, asyncSleep, setTimeout, timeouts on events, etc.) require an active event loop
 * to function. You have two main ways to use this module:
 *
 * 1. Run the OS event loop with {@link runOsEventLoop}
 * 2. Implement your own event loop using [os.pullEvent()](https://tweaked.cc/module/os.html#v:pullEvent)
 *
 * Key Features:
 * - 🔒 Type-safe event management with TypeScript
 * - ⏱️ Promise-based event waiting with timeout support
 * - 🔍 Flexible event filtering
 * - 🌐 Global OS event handling
 * - ⚡ Async/await support
 * - 🔄 Custom event systems
 *
 * Common Use Cases:
 * 1. OS Event Management:
 *    - Handling ComputerCraft events (redstone, turtle, terminal)
 *    - Managing timeouts and intervals
 *    - Coordinating async operations
 *
 * 2. Custom Event Systems:
 *    - Building robot control systems
 *    - Managing game state
 *    - Creating event-driven UIs
 *    - Implementing pub/sub patterns
 *
 * 3. Mixed Usage:
 *    - Adding custom events to the OS event system
 *    - Building modular systems with multiple event managers
 *    - Creating domain-specific event subsystems
 *
 * @example OS Event Loop Usage
 * ```typescript
 * import { on, runOsEventLoop } from "@cc-ts/helpers/scheduler";
 *
 * // Set up your OS event handlers
 * on('mouse_click', (button, x, y) => {
 *   console.log(`Click at ${x},${y}`);
 * });
 *
 * // Start the OS event loop
 * runOsEventLoop();
 * ```
 *
 * @example Extending OS Events
 * ```typescript
 * import { on, dispatch } from "@cc-ts/helpers/scheduler";
 *
 * // Declare additional OS events
 * declare module "@cc-ts/helpers/types" {
 *   interface Events {
 *     "turtle_dig": [success: boolean, block: string];
 *     "inventory_change": [slot: number, count: number];
 *   }
 * }
 *
 * // Now you can use these with the global 'on' function
 * on("turtle_dig", (success, block) => {
 *   if (success) {
 *     print(`Successfully mined ${block}`);
 *   }
 * });
 *
 * // And dispatch them
 * await dispatch("turtle_dig", true, "minecraft:diamond_ore");
 * ```
 *
 * @example Custom Event System
 * ```typescript
 * // 1. Define your event types
 * interface GameEvents {
 *   'score': [points: number, player: string];
 *   'gameOver': [winner: string];
 * }
 *
 * // 2. Create an event manager
 * const gameEvents = new EventManager<GameEvents>();
 *
 * // 3. Set up handlers
 * gameEvents.on('score', (points, player) => {
 *   console.log(`${player} scored ${points} points!`);
 * });
 *
 * // 4. Use it in your game loop
 * while (gameRunning) {
 *   // Your game logic
 *   await gameEvents.dispatch('score', 100, 'Player1');
 * }
 * ```
 *
 * @module scheduler
 */

import { pretty } from "cc.pretty";
import { Events } from "./types";

class EventHandler<
    _Events extends Record<string, any[]>,
    T extends keyof _Events = keyof _Events
> {
    constructor(
        private _handler: (...args: _Events[T]) => Promise<void> | void,
        private _filter: ((...args: _Events[T]) => boolean) | null = null,
        private _once: boolean = false
    ) {}

    public get handler() {
        return this._handler;
    }

    public get filter() {
        return this._filter;
    }

    public get once() {
        return this._once;
    }
}

/**
 * A type-safe event management system that allows for registering, dispatching, and waiting for events.
 *
 * @example
 * ```typescript
 * // Define your events
 * interface MyEvents {
 *   'player_join': [playerName: string];
 *   'item_pickup': [itemId: number, count: number];
 * }
 *
 * // Create an event manager
 * const events = new EventManager<MyEvents>();
 *
 * // Register event handlers
 * events.on('player_join', (playerName) => {
 *   console.log(`Welcome ${playerName}!`);
 * });
 * ```
 *
 * @typeParam _Events - A record type mapping event names to arrays of argument types
 */
export class EventManager<_Events extends Record<string, any[]>> {
    private eventHandlers: LuaMap<keyof _Events, LuaSet<EventHandler<_Events>>>;

    constructor() {
        this.eventHandlers = new LuaMap();
    }

    /**
     * Registers an event handler that will be called when the specified event is dispatched.
     *
     * @param name - The name of the event to listen for
     * @param handlerFunction - The function to call when the event occurs
     * @param filter - Optional function to filter events based on their arguments
     * @param once - If true, the handler will be removed after being called once
     * @returns A function that can be called to remove the event handler
     *
     * @example
     * ```typescript
     * const unsubscribe = events.on('item_pickup',
     *   (itemId, count) => console.log(`Picked up ${count} of item ${itemId}`),
     *   (itemId, count) => count > 10 // Only handle pickups of more than 10 items
     * );
     *
     * // Later, to remove the handler:
     * unsubscribe();
     * ```
     */
    public on<T extends keyof _Events>(
        name: T,
        handlerFunction: (...args: _Events[T]) => Promise<void> | void,
        filter: ((...args: _Events[T]) => boolean) | null = null,
        once: boolean = false
    ) {
        const handlers =
            this.eventHandlers.get(name) ??
            new LuaSet<EventHandler<_Events, T>>();
        const eventHandler = new EventHandler(handlerFunction, filter, once);
        handlers.add(eventHandler);
        this.eventHandlers.set(name, handlers);

        return () => this.off(name, eventHandler);
    }

    /**
     * Registers a one-time event handler that will be automatically removed after being called once.
     *
     * @param name - The name of the event to listen for
     * @param handlerFunction - The function to call when the event occurs
     * @param filter - Optional function to filter events based on their arguments
     * @returns A function that can be called to remove the event handler
     *
     * @example
     * ```typescript
     * events.once('player_join',
     *   (playerName) => console.log(`First player to join: ${playerName}`)
     * );
     * ```
     */
    public once<T extends keyof _Events>(
        name: T,
        handlerFunction: (...args: _Events[T]) => Promise<void> | void,
        filter: ((...args: _Events[T]) => boolean) | null = null
    ) {
        return this.on(name, handlerFunction, filter, true);
    }

    protected off<T extends keyof _Events>(
        name: T,
        handler: EventHandler<_Events, T>
    ) {
        const handlers = this.eventHandlers.get(name);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    /**
     * Returns a promise that resolves when the specified event occurs.
     *
     * @param name - The name of the event to wait for
     * @param check - Optional function to filter events based on their arguments
     * @param timeout - Optional timeout in milliseconds. If 0, waits indefinitely
     * @returns A promise that resolves with the event arguments
     * @throws If the timeout is reached before the event occurs
     *
     * @example
     * ```typescript
     * try {
     *   const [itemId, count] = await events.waitForEvent(
     *     'item_pickup',
     *     (itemId) => itemId === 64, // Wait for diamond pickup
     *     5000 // Timeout after 5 seconds
     *   );
     *   console.log(`Picked up ${count} diamonds!`);
     * } catch (error) {
     *   console.log('Timed out waiting for diamond pickup');
     * }
     * ```
     */
    public waitForEvent<T extends keyof _Events>(
        name: T,
        check: (...args: _Events[T]) => boolean = () => true,
        timeout: number = 0
    ) {
        return new Promise<_Events[T]>((_resolve, reject) => {
            if (timeout <= 0) {
                this.once(name, (...args) => _resolve(args), check);

                return;
            }

            const timeoutId = os.startTimer(timeout);

            let disableTimeout: () => void;
            let unsubscribe = this.once(
                name,
                (...args) => {
                    disableTimeout && disableTimeout();
                    os.cancelTimer(timeoutId);
                    _resolve(args);
                },
                check
            );
            disableTimeout = osEvents.once(
                "timer",
                () => {
                    unsubscribe();
                    reject(`Event ${name as string} timed out`);
                },
                (id) => {
                    return id === timeoutId;
                }
            );
        });
    }

    /**
     * Returns a promise that resolves when any of the specified events occur.
     *
     * @param names - Array of event names to wait for
     * @param check - Optional function to filter events based on their name and arguments
     * @param timeout - Optional timeout in milliseconds. If 0, waits indefinitely
     * @returns A promise that resolves with a tuple of the event name and arguments
     * @throws If the timeout is reached before any of the events occur
     *
     * @example
     * ```typescript
     * try {
     *   const [event, ...args] = await events.waitForAnyEvent(
     *     ['player_join', 'player_leave'],
     *     (event, ...args) => event === 'player_join' || args[0] === 'admin',
     *     10000
     *   );
     *   if (event === 'player_join') {
     *     console.log(`Player ${args[0]} joined`);
     *   } else {
     *     console.log(`Player ${args[0]} left`);
     *   }
     * } catch (error) {
     *   console.log('Timed out waiting for player events');
     * }
     * ```
     */
    public waitForAnyEvent<T extends keyof _Events>(
        names: T[],
        check: (event: T, ...args: _Events[T]) => boolean = () => true,
        timeout: number = 0
    ) {
        return new Promise<[T, ..._Events[T]]>((_resolve, reject) => {
            if (timeout <= 0) {
                for (const name of names) {
                    this.once(
                        name,
                        (...args) => _resolve([name, ...args]),
                        (...args) => check(name, ...args)
                    );
                }

                return;
            }

            const timeoutId = os.startTimer(timeout);

            let disableTimeout: () => void;
            let unsubscribe = names.map((name) =>
                this.once(
                    name,
                    (...args) => {
                        disableTimeout && disableTimeout();
                        os.cancelTimer(timeoutId);
                        _resolve([name, ...args]);
                    },
                    (...args) => check(name, ...args)
                )
            );
            disableTimeout = osEvents.once(
                "timer",
                () => {
                    unsubscribe.forEach((unsubscribe) => unsubscribe());
                    reject(`Event ${names.join(", ")} timed out`);
                },
                (id) => {
                    return id === timeoutId;
                }
            );
        });
    }

    /**
     * Dispatches an event, calling all registered handlers with the provided arguments.
     *
     * @param name - The name of the event to dispatch
     * @param args - The arguments to pass to the event handlers
     *
     * @example
     * ```typescript
     * await events.dispatch('item_pickup', 64, 1); // Dispatch diamond pickup event
     * ```
     */
    public async dispatch<T extends keyof _Events>(
        name: T,
        ...args: _Events[T]
    ) {
        const handlers = this.eventHandlers.get(name);
        if (handlers) {
            for (const handler of handlers) {
                if (handler.filter && !handler.filter(...args)) continue;

                const failed = await handler.handler(...args)?.catch((err) => {
                    if (err instanceof Panic) {
                        throw err;
                    }

                    print("CCS | Dispatch error:", err);
                    return true;
                });

                if (handler.once === true && !failed) {
                    // print("deleting", name);
                    handlers.delete(handler);
                }
            }

            this.eventHandlers.set(name, handlers);
        }
    }
}

/**
 * A panic error that indicates unrecoverable situations.
 *
 * @extends Error
 */
export class Panic extends Error {
    name = "CTS_PANIC";
}

/**
 * Global event manager instance for operating system events
 *
 * ⚠️ NOTE: Requires an active event loop (via runOsEventLoop or custom implementation)
 * to process events
 * @see {@link runOsEventLoop}
 */
export const osEvents = new EventManager<Events>();

/**
 * Binds an event handler to an operating system event
 *
 * ⚠️ NOTE: Requires an active event loop to process events
 * @see {@link osEvents}
 * @see {@link EventManager.on}
 */
export const on = osEvents.on.bind(osEvents) as typeof osEvents.on;

/**
 * Binds a one-time event handler to an operating system event
 *
 * ⚠️ NOTE: Requires an active event loop to process events
 * @see {@link osEvents}
 * @see {@link EventManager.once}
 */
export const once = osEvents.once.bind(osEvents) as typeof osEvents.once;

/**
 * Waits for a specific operating system event to occur
 *
 * ⚠️ NOTE: Requires an active event loop to process events
 * @see {@link osEvents}
 * @see {@link EventManager.waitForEvent}
 */
export const waitForEvent = osEvents.waitForEvent.bind(
    osEvents
) as typeof osEvents.waitForEvent;

/**
 * Waits for any of the specified operating system events to occur
 *
 * ⚠️ NOTE: Requires an active event loop to process events
 * @see {@link osEvents}
 * @see {@link EventManager.waitForAnyEvent}
 */
export const waitForAnyEvent = osEvents.waitForAnyEvent.bind(
    osEvents
) as typeof osEvents.waitForAnyEvent;

/**
 * Dispatches an operating system event
 *
 * @see {@link osEvents}
 * @see {@link EventManager.dispatch}
 */
export const dispatch = osEvents.dispatch.bind(
    osEvents
) as typeof osEvents.dispatch;

/**
 * Pauses execution for the specified number of milliseconds
 *
 * ⚠️ NOTE: Requires an active event loop to function
 * @see {@link osEvents}
 * @see {@link runOsEventLoop}
 *
 * @param ms - The number of milliseconds to sleep
 *
 * @example
 * ```typescript
 * // In your code:
 * async function main() {
 *   console.log('Starting');
 *   await asyncSleep(1000); // Wait for 1 second
 *   console.log('Done');
 * }
 *
 * void main();
 *
 * // Make sure you have an event loop running!
 * runOsEventLoop();
 * ```
 */
export const asyncSleep = async (ms: number) => {
    const timer = os.startTimer(ms / 1000);
    await waitForEvent("timer", (id) => id === timer);
    return;
};

/**
 * Executes a function after the specified delay
 *
 * ⚠️ NOTE: Requires an active event loop to function
 * @see {@link osEvents}
 * @see {@link runOsEventLoop}
 *
 * @param func - The function to execute
 * @param ms - The delay in milliseconds
 *
 * @example
 * ```typescript
 * // In your code:
 * setTimeout(() => {
 *   console.log('This runs after 1 second');
 * }, 1000);
 *
 * // Make sure you have an event loop running!
 * runOsEventLoop();
 * ```
 */
export const setTimeout = (func: () => void, ms: number) => {
    asyncSleep(ms).then(func);
};

/**
 * Utility function to escalate promise rejections into thrown errors.
 * Used to make promises throw the errors instead of ignoring them.
 *
 * @param error - The error to escalate
 * @throws The original error if it's an Error instance, or a new Error with the error message
 *
 * @example
 * ```typescript
 * await waitForEvent('player_join')
 *   .catch(escalate); // Will throw instead of silently failing
 * ```
 */
export const escalate = (error: unknown) => {
    if (error instanceof Error) {
        throw error;
    }
    throw new Error(`${error}`);
};

/**
 * Throws a panic error with the specified message.
 * Panic errors are special errors that indicate unrecoverable situations.
 *
 * @param message - The panic message
 * @param cause - Optional cause of the panic
 * @throws A Panic error
 *
 * @example
 * ```typescript
 * if (criticalSystemFailure) {
 *   PANIC('Critical system failure', error);
 * }
 * ```
 */
export const PANIC = (message: string, cause?: unknown) => {
    print("CTS | Panicking:", message);
    throw new Panic(message, { cause });
};

/**
 * Runs the main operating system event loop, dispatching events to registered handlers.
 *
 * ⚠️ NOTE: Not allowed to be called from within an async function or Promise.
 * This is because TSTL's polyfill of Promises makes use of coroutines, and the internal os.pullEvent() call of this function won't work.
 *
 * @param raw - If true, uses os.pullEventRaw instead of os.pullEvent
 * @param debug - If true, prints debug information about events
 * @throws When an error occurs in the event loop
 *
 * @example
 * ```typescript
 * try {
 *   runOsEventLoop(false, true); // Run with debug logging
 * } catch (error) {
 *   console.error('Event loop crashed:', error);
 * }
 * ```
 */
export const runOsEventLoop = (raw = false, debug = false) => {
    print("CTS | Running OS event loop");

    let error: Error | undefined;
    while (!error) {
        const [event, ...args] = raw ? os.pullEventRaw() : os.pullEvent();
        debug && print("CTS | Event:", event, pretty(args));
        dispatch(event, ...args).catch((err) => {
            error = err;
        });
    }

    if (!(error instanceof Panic)) {
        print("CTS | Error in OS event loop, exiting...");
    }

    throw error;
};
