import {
    defaultFormatter,
    type DefaultErrorShape,
    type ErrorFormatter,
} from "./error/formatter";
import { createMiddlewareFactory } from "./middleware";
import { createBuilder } from "./procedureBuilder";
import type { CreateRootTypes } from "./rootConfig";
import { type RootConfig } from "./rootConfig";
import { createRouterFactory, mergeRouters } from "./router";
import type { DataTransformerOptions } from "./transformer";
import { defaultTransformer, getDataTransformer } from "./transformer";
import type { Unwrap, ValidateShape } from "./types";

type inferErrorFormatterShape<TType> = TType extends ErrorFormatter<
    any,
    infer TShape
>
    ? TShape
    : DefaultErrorShape;
interface RuntimeConfigOptions<TContext extends object, TMeta extends object>
    extends Partial<
        Omit<
            RootConfig<{
                ctx: TContext;
                meta: TMeta;
                errorShape: any;
                transformer: any;
            }>,
            "$types" | "transformer"
        >
    > {
    /**
     * Use a data transformer
     * @see https://trpc.io/docs/v11/data-transformers
     */
    transformer?: DataTransformerOptions;
}

type ContextCallback = (...args: any[]) => object | Promise<object>;

class CRPCBuilder<TContext extends object, TMeta extends object> {
    /**
     * Add a context shape as a generic to the root object
     * @see https://trpc.io/docs/v11/server/context
     */
    context<TNewContext extends object | ContextCallback>() {
        return new CRPCBuilder<
            TNewContext extends ContextCallback
                ? Unwrap<TNewContext>
                : TNewContext,
            TMeta
        >();
    }

    /**
     * Add a meta shape as a generic to the root object
     * @see https://trpc.io/docs/v11/quickstart
     */
    meta<TNewMeta extends object>() {
        return new CRPCBuilder<TContext, TNewMeta>();
    }

    /**
     * Create the root object
     * @see https://trpc.io/docs/v11/server/routers#initialize-trpc
     */
    create<TOptions extends RuntimeConfigOptions<TContext, TMeta>>(
        opts?: ValidateShape<TOptions, RuntimeConfigOptions<TContext, TMeta>>
    ) {
        type $Root = CreateRootTypes<{
            ctx: TContext;
            meta: TMeta;
            errorShape: undefined extends TOptions["errorFormatter"]
                ? DefaultErrorShape
                : inferErrorFormatterShape<TOptions["errorFormatter"]>;
            transformer: undefined extends TOptions["transformer"]
                ? false
                : true;
        }>;

        const config: RootConfig<$Root> = {
            ...opts,
            transformer: getDataTransformer(
                opts?.transformer ?? defaultTransformer
            ),
            errorFormatter: opts?.errorFormatter ?? defaultFormatter,
            /**
             * These are just types, they can't be used at runtime
             * @internal
             */
            $types: null as any,
        };

        return {
            /**
             * Your router config
             * @internal
             */
            _config: config,
            /**
             * Builder object for creating procedures
             * @see https://trpc.io/docs/v11/server/procedures
             */
            procedure: createBuilder<$Root["ctx"], $Root["meta"]>({
                meta: opts?.defaultMeta,
            }),
            /**
             * Create reusable middlewares
             * @see https://trpc.io/docs/v11/server/middlewares
             */
            middleware: createMiddlewareFactory<$Root["ctx"], $Root["meta"]>(),
            /**
             * Create a router
             * @see https://trpc.io/docs/v11/server/routers
             */
            router: createRouterFactory<$Root>(config),
            /**
             * Merge Routers
             * @see https://trpc.io/docs/v11/server/merging-routers
             */
            mergeRouters,
        };
    }
}

/**
 * Builder to initialize the tRPC root object - use this exactly once per backend
 * @see https://trpc.io/docs/v11/quickstart
 */
export const initCRPC = new CRPCBuilder();
export type { CRPCBuilder };