import type { DefaultErrorShape, ErrorFormatter } from "./error/formatter";
import { CombinedDataTransformer } from "./transformer";

/**
 * The initial generics that are used in the init function
 * @internal
 */
export interface RootTypes {
    ctx: object;
    meta: object;
    errorShape: DefaultErrorShape;
    transformer: boolean;
}

/**
 * The tRPC root config
 * @internal
 */
export interface RootConfig<TTypes extends RootTypes> {
    /**
     * The types that are used in the config
     * @internal
     */
    $types: TTypes;
    /**
     * Use a data transformer
     * @see https://trpc.io/docs/v11/data-transformers
     */
    transformer: CombinedDataTransformer;
    /**
     * Use custom error formatting
     * @see https://trpc.io/docs/v11/error-formatting
     */
    errorFormatter: ErrorFormatter<TTypes["ctx"], TTypes["errorShape"]>;

    defaultMeta?: TTypes["meta"] extends object ? TTypes["meta"] : never;
    experimental?: {};
}

/**
 * @internal
 */
export type CreateRootTypes<TGenerics extends RootTypes> = TGenerics;

export type AnyRootTypes = CreateRootTypes<{
    ctx: any;
    meta: any;
    errorShape: any;
    transformer: any;
}>;

type PartialIf<TCondition extends boolean, TType> = TCondition extends true
    ? Partial<TType>
    : TType;

/**
 * Adds a `createContext` option with a given callback function
 * If context is the default value, then the `createContext` option is optional
 */
export type CreateContextCallback<
    TContext,
    TFunction extends (...args: any[]) => any
> = PartialIf<
    object extends TContext ? true : false,
    {
        /**
         * @see https://trpc.io/docs/v11/context
         **/
        createContext: TFunction;
    }
>;
