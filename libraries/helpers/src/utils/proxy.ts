/**
 * @module proxy
 * @description 🎭 Lua-friendly proxy implementation for intercepting object operations
 *
 * This module provides a proxy implementation that works with Lua's metatables,
 * allowing you to intercept and customize object behavior. Perfect for creating
 * mock objects, adding validation, or implementing virtual properties!
 *
 * @example Creating a logging proxy
 * ```typescript
 * const target = { count: 0 };
 * const proxy = createProxy(target, {
 *     get: (obj, key) => {
 *         print(`Accessing ${key}`);
 *         return obj[key];
 *     },
 *     set: (obj, key, value) => {
 *         print(`Setting ${key} to ${value}`);
 *         obj[key] = value;
 *     }
 * });
 *
 * proxy.count++; // Logs: "Accessing count", "Setting count to 1"
 * ```
 */

/**
 * Interface defining handlers for proxy operations
 *
 * @typeParam T - The type of object being proxied
 */
export interface ProxyHandler<T> {
    /**
     * Intercepts property access
     * @param target - The original object
     * @param key - Property being accessed
     * @returns The property value
     */
    get?(target: T, key: string): any;

    /**
     * Intercepts property assignment
     * @param target - The original object
     * @param key - Property being set
     * @param value - New value being assigned
     */
    set?(target: T, key: string, value: any): void;

    /**
     * Intercepts function calls (when target is callable)
     * @param target - The original function
     * @param args - Arguments passed to the function
     * @returns The function result
     */
    apply?(target: T, ...args: any[]): any;
}

/**
 * Creates a proxy object that can intercept operations on a target object
 *
 * @typeParam T - Type of object to proxy (must be an object)
 * @param target - Object to proxy
 * @param handler - Object containing proxy trap functions
 * @returns A proxy wrapping the target object
 *
 * @example Virtual Properties
 * ```typescript
 * const person = { firstName: "John", lastName: "Doe" };
 * const withFullName = createProxy(person, {
 *     get: (obj, key) => {
 *         if (key === "fullName") {
 *             return `${obj.firstName} ${obj.lastName}`;
 *         }
 *         return obj[key];
 *     }
 * });
 *
 * print(withFullName.fullName); // "John Doe"
 * ```
 *
 * @example Validation
 * ```typescript
 * const numbers = createProxy([] as number[], {
 *     set: (obj, key, value) => {
 *         if (typeof value !== "number") {
 *             error("Only numbers allowed!");
 *         }
 *         obj[key] = value;
 *     }
 * });
 *
 * numbers.push(42); // OK
 * numbers.push("not a number"); // Throws error
 * ```
 */
export function createProxy<T extends object>(
    target: T,
    handler: ProxyHandler<T>
): T {
    const proxy = {} as T;

    const mt = {
        __index: (key: string) => {
            if (handler.get) {
                return handler.get(target, key);
            }
            return target[key];
        },

        __newindex: (key: string, value: any) => {
            if (handler.set) {
                handler.set(target, key, value);
            } else {
                target[key] = value;
            }
        },

        __call: handler.apply,
    };

    setmetatable(proxy, mt);

    return proxy;
}
