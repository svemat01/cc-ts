import { pretty, pretty_print } from "cc.pretty";

/** @internal */
export const unsetMarker = Symbol();
export type UnsetMarker = typeof unsetMarker;

/**
 * Ensures there are no duplicate keys when building a procedure.
 * @internal
 */
export function mergeWithoutOverrides<TType extends Record<string, unknown>>(
    obj1: TType,
    ...objs: Partial<TType>[]
): TType {
    const newObj: TType = { ...obj1 };

    for (const overrides of objs) {
        for (const key in overrides) {
            if (key in newObj && newObj[key] !== overrides[key]) {
                throw new Error(`Duplicate key ${key}`);
            }
            newObj[key as keyof TType] = overrides[key] as TType[keyof TType];
        }
    }
    return newObj;
}

/**
 * Check that value is object
 * @internal
 */
export function isObject(value: unknown): value is Record<string, unknown> {
    return !!value && !Array.isArray(value) && typeof value === "object";
}

type AnyFn = ((...args: any[]) => unknown) & Record<keyof any, unknown>;
export function isFunction(fn: unknown): fn is AnyFn {
    return typeof fn === "function";
}

export function isAsyncIterable<TValue>(
    value: unknown
): value is AsyncIterable<TValue> {
    pretty_print({
        value,
        isObject: isObject(value),
        // @ts-ignore
        SymbolIterator: Symbol.iterator in value,
    });
    return (
        isObject(value) &&
        // Typescript to lua uses Symbol.iterator instead of Symbol.asyncIterator
        Symbol.iterator in value
    );
}

/**
 * Run an IIFE
 */
export const run = <TValue>(fn: () => TValue): TValue => fn();

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop(): void {}

export function identity<T>(it: T): T {
    return it;
}

/**
 * Generic runtime assertion function. Throws, if the condition is not `true`.
 *
 * Can be used as a slightly less dangerous variant of type assertions. Code
 * mistakes would be revealed at runtime then (hopefully during testing).
 */
export function assert(
    condition: boolean,
    msg = "no additional info"
): asserts condition {
    if (!condition) {
        throw new Error(`AssertionError: ${msg}`);
    }
}
