/**
 * @module AbortController
 *
 * 🎮 A TypeScript implementation of the standard AbortController API for ComputerCraft!
 * Perfect for when you need to cancel operations faster than a creeper changes its mind.
 *
 * Key Features:
 * - 🛑 Cancel async operations gracefully
 * - ⏲️ Set timeouts that actually work
 * - 🔗 Combine multiple abort signals
 * - 🎯 Event-based cancellation handling
 *
 * @example
 * ```ts
 * // Creating a self-destruct sequence (that we can cancel!)
 * const controller = new AbortController();
 *
 * async function selfDestruct() {
 *   try {
 *     for(let i = 10; i > 0; i--) {
 *       controller.signal.throwIfAborted();
 *       print(`Self-destruct in ${i}...`);
 *       await sleep(1000);
 *     }
 *     print("💥 BOOM!");
 *   } catch (e) {
 *     print("Self-destruct cancelled! Phew!");
 *   }
 * }
 *
 * // Start the countdown
 * selfDestruct();
 *
 * // Changed our mind? Just abort!
 * controller.abort("Never mind!");
 * ```
 *
 * Common Use Cases:
 * - Cancelling long-running network requests
 * - Implementing timeout mechanisms
 * - Stopping turtle operations mid-way
 * - Cancelling resource-intensive computations
 *
 * @warning This implementation closely follows the web standard but is adapted
 * for ComputerCraft's environment. Some subtle differences may exist.
 */

import { setTimeout } from "./scheduler";

/**
 * 🚦 AbortSignal represents a signal object that allows you to communicate with
 * a DOM request and abort it if required via an AbortController.
 *
 * Think of it as a magical redstone signal that can stop things!
 *
 * @example
 * ```ts
 * // Create a signal that automatically aborts after 5 seconds
 * const signal = AbortSignal.timeout(5000);
 *
 * async function longRunningTask(signal: AbortSignal) {
 *   while(true) {
 *     signal.throwIfAborted(); // Will throw after 5 seconds
 *     // Do some work...
 *     await sleep(100);
 *   }
 * }
 * ```
 */
export class AbortSignal {
    private _aborted = false;
    private _reason: any;
    public onabort: (() => void) | null = null;
    private _listeners = new LuaSet<(event: { type: "abort" }) => void>();

    constructor() {}

    /**
     * Creates an AbortSignal that is already aborted.
     *
     * @param reason - The abort reason (like "timeout" or "user cancelled")
     * @returns A pre-aborted AbortSignal
     *
     * @example
     * ```ts
     * // Create an already aborted signal
     * const signal = AbortSignal.abort("Operation cancelled");
     *
     * // This will throw immediately
     * signal.throwIfAborted(); // throws "Operation cancelled"
     * ```
     */
    static abort(reason?: any): AbortSignal {
        const signal = new AbortSignal();
        signal._aborted = true;
        signal._reason = reason;
        return signal;
    }

    /**
     * Creates an AbortSignal that automatically aborts after the specified delay.
     * Perfect for implementing timeouts!
     *
     * @param delay - Time in milliseconds before the signal aborts
     * @returns An AbortSignal that will abort after the delay
     * @throws {Error} When the timeout expires
     *
     * @example
     * ```ts
     * // Create a signal that aborts after 5 seconds
     * const signal = AbortSignal.timeout(5000);
     *
     * try {
     *   await doLongTask(signal);
     * } catch (e) {
     *   print("Task timed out!");
     * }
     * ```
     */
    static timeout(delay: number): AbortSignal {
        const signal = new AbortSignal();
        setTimeout(() => {
            signal._aborted = true;
            signal._reason = new Error(`Timed out in ${delay}ms.`);
            signal.dispatchEvent();
        }, delay);
        return signal;
    }

    /**
     * Combines multiple AbortSignals into one. If any of the input signals
     * abort, the resulting signal will also abort.
     *
     * @param signals - Array of AbortSignals to combine
     * @returns A new AbortSignal that aborts when any input signal aborts
     *
     * @example
     * ```ts
     * // Abort if either 5 seconds pass OR user cancels
     * const timeoutSignal = AbortSignal.timeout(5000);
     * const userSignal = new AbortController().signal;
     *
     * const combinedSignal = AbortSignal.any([timeoutSignal, userSignal]);
     * ```
     */
    static any(signals: AbortSignal[]): AbortSignal {
        const signal = new AbortSignal();
        for (const s of signals) {
            if (s.aborted) {
                signal._aborted = true;
                signal._reason = s.reason;
                break;
            }
            s.addEventListener(() => {
                if (!signal.aborted) {
                    signal._aborted = true;
                    signal._reason = s.reason;
                    signal.dispatchEvent();
                }
            });
        }
        return signal;
    }

    /**
     * Adds an event listener for the abort event.
     *
     * @param listener - Function to call when the signal is aborted
     * @param options - Listener options (currently only supports 'once')
     *
     * @example
     * ```ts
     * signal.addEventListener(() => {
     *   print("Signal was aborted!");
     * }, { once: true });
     * ```
     */
    addEventListener(
        listener: (event: { type: "abort" }) => void,
        options?: { once?: boolean }
    ) {
        if (options?.once) {
            const onceListener = (event: { type: "abort" }) => {
                listener(event);
                this._listeners.delete(onceListener);
            };
            this._listeners.add(onceListener);
        } else {
            this._listeners.add(listener);
        }
    }

    dispatchEvent(_event?: "abort") {
        const event = { type: "abort" as const };
        for (const listener of this._listeners) {
            listener(event);
        }
        if (this.onabort) {
            this.onabort();
        }
    }

    get aborted(): boolean {
        return this._aborted;
    }

    get reason(): any {
        return this._reason;
    }

    throwIfAborted(): void {
        if (this._aborted) {
            throw this._reason;
        }
    }
}

/**
 * 🎮 The main controller object that lets you abort operations on demand.
 * Think of it as a remote control for your async operations!
 *
 * @example
 * ```ts
 * // Example: Implementing a timeout for a network request
 * async function fetchWithTimeout(url: string, timeout: number) {
 *   const controller = new AbortController();
 *   const timeoutId = setTimeout(() => controller.abort(), timeout);
 *
 *   try {
 *     const response = await fetch(url, { signal: controller.signal });
 *     clearTimeout(timeoutId);
 *     return response;
 *   } catch (e) {
 *     if (controller.signal.aborted) {
 *       throw new Error("Request timed out!");
 *     }
 *     throw e;
 *   }
 * }
 * ```
 */
export class AbortController {
    private _signal: AbortSignal;

    constructor() {
        this._signal = new AbortSignal();
    }

    get signal(): AbortSignal {
        return this._signal;
    }

    abort(reason?: any) {
        // @ts-expect-error Set private property
        this._signal._aborted = true;
        // @ts-expect-error Set private property
        this._signal._reason = reason;
        this._signal.dispatchEvent("abort");
    }
}
