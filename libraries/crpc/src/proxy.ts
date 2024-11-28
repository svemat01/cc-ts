import { createProxy } from "@cc-ts/helpers/proxy";

interface ProxyCallbackOptions {
    path: readonly string[];
    args: readonly unknown[];
}
type ProxyCallback = (opts: ProxyCallbackOptions) => unknown;

const noop = () => {
    // noop
};

function createInnerProxy(
    callback: ProxyCallback,
    path: readonly string[],
    memo: Record<string, unknown>
) {
    const cacheKey = path.join(".");

    memo[cacheKey] ??= createProxy(noop, {
        get(_obj, key) {
            if (typeof key !== "string" || key === "then") {
                // special case for if the proxy is accidentally treated
                // like a PromiseLike (like in `Promise.resolve(proxy)`)
                return undefined;
            }
            return createInnerProxy(callback, [...path, key], memo);
        },
        apply(_obj, ...args) {
            const lastOfPath = path[path.length - 1];

            let opts = { args, path };
            // special handling for e.g. `trpc.hello.call(this, 'there')` and `trpc.hello.apply(this, ['there'])
            if (lastOfPath === "call") {
                opts = {
                    args: args.length >= 2 ? [args[1]] : [],
                    path: path.slice(0, -1),
                };
            } else if (lastOfPath === "apply") {
                opts = {
                    args: args.length >= 2 ? args[1] : [],
                    path: path.slice(0, -1),
                };
            }
            return callback(opts);
        },
    });

    return memo[cacheKey];
}

/**
 * Creates a proxy that calls the callback with the path and arguments
 *
 * @internal
 */
export const createRecursiveProxy = <TFaux = unknown>(
    callback: ProxyCallback
): TFaux => createInnerProxy(callback, [], {}) as TFaux;

/**
 * Used in place of `new Proxy` where each handler will map 1 level deep to another value.
 *
 * @internal
 */
export const createFlatProxy = <TFaux>(
    callback: (path: string & keyof TFaux) => any
): TFaux => {
    return createProxy(noop, {
        get(_obj, name) {
            if (typeof name !== "string" || name === "then") {
                // special case for if the proxy is accidentally treated
                // like a PromiseLike (like in `Promise.resolve(proxy)`)
                return undefined;
            }
            return callback(name as any);
        },
    }) as TFaux;
};
