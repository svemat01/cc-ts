import { defaultFormatter } from "./error/formatter";
import { getCRPCErrorFromUnknown, CRPCError } from "./error/CRPCError";
import type {
    AnyProcedure,
    ErrorHandlerOptions,
    inferProcedureInput,
    inferProcedureOutput,
} from "./procedure";
import type { ProcedureCallOptions } from "./procedureBuilder";
import type { AnyRootTypes, RootConfig } from "./rootConfig";
import { defaultTransformer } from "./transformer";
import type { ValueOf } from "./types";
import { mergeWithoutOverrides } from "./utils";

export interface RouterRecord {
    [key: string]: AnyProcedure | RouterRecord;
}

/**
 * @internal
 */
export type RouterCallerErrorHandler<TContext> = (
    opts: ErrorHandlerOptions<TContext>
) => void;

export interface Router<
    TRoot extends AnyRootTypes,
    TRecord extends RouterRecord
> {
    _def: {
        _config: RootConfig<TRoot>;
        router: true;
        procedure?: never;
        procedures: TRecord;
        record: TRecord;
    };
    // /**
    //  * @deprecated use `t.createCallerFactory(router)` instead
    //  * @see https://trpc.io/docs/v11/server/server-side-calls
    //  */
    // createCaller: RouterCaller<TRoot, TRecord>;
}

export type BuiltRouter<
    TRoot extends AnyRootTypes,
    TDef extends RouterRecord
> = Router<TRoot, TDef> & TDef;

export type AnyRouter = Router<any, any>;

export type inferRouterRootTypes<TRouter extends AnyRouter> =
    TRouter["_def"]["_config"]["$types"];

export type inferRouterContext<TRouter extends AnyRouter> =
    inferRouterRootTypes<TRouter>["ctx"];
export type inferRouterError<TRouter extends AnyRouter> =
    inferRouterRootTypes<TRouter>["errorShape"];
export type inferRouterMeta<TRouter extends AnyRouter> =
    inferRouterRootTypes<TRouter>["meta"];

function isRouter(
    procedureOrRouter: ValueOf<CreateRouterOptions>
): procedureOrRouter is AnyRouter {
    return procedureOrRouter?._def && "router" in procedureOrRouter._def;
}

const emptyRouter = {
    _ctx: null as any,
    _errorShape: null as any,
    _meta: null as any,
    queries: {},
    mutations: {},
    subscriptions: {},
    errorFormatter: defaultFormatter,
    transformer: defaultTransformer,
};

/**
 * Reserved words that can't be used as router or procedure names
 */
const reservedWords = [
    /**
     * Then is a reserved word because otherwise we can't return a promise that returns a Proxy
     * since JS will think that `.then` is something that exists
     */
    "then",
    /**
     * `fn.call()` and `fn.apply()` are reserved words because otherwise we can't call a function using `.call` or `.apply`
     */
    "call",
    "apply",
];

export type CreateRouterOptions = {
    [key: string]: AnyProcedure | AnyRouter | CreateRouterOptions;
};

export type DecorateCreateRouterOptions<
    TRouterOptions extends CreateRouterOptions
> = {
    [K in keyof TRouterOptions]: TRouterOptions[K] extends infer $Value
        ? $Value extends AnyProcedure
            ? $Value
            : $Value extends Router<any, infer TRecord>
            ? TRecord
            : $Value extends CreateRouterOptions
            ? DecorateCreateRouterOptions<$Value>
            : never
        : never;
};

/**
 * @internal
 */
export function createRouterFactory<TRoot extends AnyRootTypes>(
    config: RootConfig<TRoot>
) {
    function createRouterInner<TInput extends RouterRecord>(
        input: TInput
    ): BuiltRouter<TRoot, TInput>;
    function createRouterInner<TInput extends CreateRouterOptions>(
        input: TInput
    ): BuiltRouter<TRoot, DecorateCreateRouterOptions<TInput>>;
    function createRouterInner(input: RouterRecord | CreateRouterOptions) {
        const reservedWordsUsed = new Set(
            Object.keys(input).filter((v) => reservedWords.includes(v))
        );
        if (reservedWordsUsed.size > 0) {
            throw new Error(
                "Reserved words used in `router({})` call: " +
                    Array.from(reservedWordsUsed).join(", ")
            );
        }

        const procedures: Record<string, AnyProcedure> = {};

        function step(from: CreateRouterOptions, path: readonly string[] = []) {
            const aggregate: RouterRecord = {};
            for (const [key, item] of Object.entries(from ?? {})) {
                if (isRouter(item)) {
                    aggregate[key] = step(item._def.record, [...path, key]);
                    continue;
                }
                if (!isProcedure(item)) {
                    // RouterRecord
                    aggregate[key] = step(item, [...path, key]);
                    continue;
                }

                const newPath = [...path, key].join(".");

                if (procedures[newPath]) {
                    throw new Error(`Duplicate key: ${newPath}`);
                }

                procedures[newPath] = item;
                aggregate[key] = item;
            }

            return aggregate;
        }
        const record = step(input);

        const _def: AnyRouter["_def"] = {
            _config: config,
            router: true,
            procedures,
            ...emptyRouter,
            record,
        };

        return {
            ...record,
            _def,
            // createCaller: createCallerFactory<TRoot>()({
            //     _def,
            // }),
        };
    }

    return createRouterInner;
}

function isProcedure(
    procedureOrRouter: ValueOf<CreateRouterOptions>
): procedureOrRouter is AnyProcedure {
    // return typeof procedureOrRouter === "function";
    return (
        procedureOrRouter?._def &&
        "procedure" in procedureOrRouter._def &&
        procedureOrRouter._def.procedure === true
    );
}
/**
 * @internal
 */
export function callProcedure(
    opts: ProcedureCallOptions<unknown> & {
        procedures: RouterRecord;
        allowMethodOverride?: boolean;
    }
) {
    const { type, path } = opts;
    const proc = opts.procedures[path];
    if (
        !proc ||
        !isProcedure(proc) ||
        (proc._def.type !== type && !opts.allowMethodOverride)
    ) {
        throw new CRPCError({
            code: "NOT_FOUND",
            message: `No "${type}"-procedure on path "${path}"`,
        });
    }

    /* istanbul ignore if -- @preserve */
    if (
        proc._def.type !== type &&
        opts.allowMethodOverride &&
        proc._def.type === "subscription"
    ) {
        throw new CRPCError({
            code: "METHOD_NOT_SUPPORTED",
            message: `Method override is not supported for subscriptions`,
        });
    }

    return proc(opts);
}

/** @internal */
type MergeRouters<
    TRouters extends AnyRouter[],
    TRoot extends AnyRootTypes = TRouters[0]["_def"]["_config"]["$types"],
    TRecord extends RouterRecord = {}
> = TRouters extends [
    infer Head extends AnyRouter,
    ...infer Tail extends AnyRouter[]
]
    ? MergeRouters<Tail, TRoot, Head["_def"]["record"] & TRecord>
    : BuiltRouter<TRoot, TRecord>;

export function mergeRouters<TRouters extends AnyRouter[]>(
    ...routerList: [...TRouters]
): MergeRouters<TRouters> {
    const record = mergeWithoutOverrides(
        {},
        ...routerList.map((r) => r._def.record)
    );
    const errorFormatter = routerList.reduce(
        (currentErrorFormatter, nextRouter) => {
            if (
                nextRouter._def._config.errorFormatter &&
                nextRouter._def._config.errorFormatter !== defaultFormatter
            ) {
                if (
                    currentErrorFormatter !== defaultFormatter &&
                    currentErrorFormatter !==
                        nextRouter._def._config.errorFormatter
                ) {
                    throw new Error(
                        "You seem to have several error formatters"
                    );
                }
                return nextRouter._def._config.errorFormatter;
            }
            return currentErrorFormatter;
        },
        defaultFormatter
    );

    const transformer = routerList.reduce((prev, current) => {
        if (
            current._def._config.transformer &&
            current._def._config.transformer !== defaultTransformer
        ) {
            if (
                prev !== defaultTransformer &&
                prev !== current._def._config.transformer
            ) {
                throw new Error("You seem to have several transformers");
            }
            return current._def._config.transformer;
        }
        return prev;
    }, defaultTransformer);

    const router = createRouterFactory({
        errorFormatter,
        transformer,
        $types: routerList[0]?._def._config.$types,
    })(record);

    return router as MergeRouters<TRouters>;
}
