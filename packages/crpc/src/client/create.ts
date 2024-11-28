import { inferTransformedProcedureOutput } from "../clientish/inference";
import { inferClientTypes } from "../clientish/inferrable";
import { CRPCClientError } from "../error/CRPCClientError";
import {
    AnyProcedure,
    inferProcedureInput,
    ProcedureOptions,
    ProcedureType,
} from "../procedure";
import { createFlatProxy, createRecursiveProxy } from "../proxy";
import { AnyRouter, RouterRecord } from "../router";
import { IntersectionError, Unsubscribable } from "../types";
import {
    CreateCRPCClientOptions,
    CRPCSubscriptionOptions,
    CRPCUntypedClient,
} from "./createUntyped";
import { UntypedClientProperties } from "./createUntyped";
import { CRPCSubscriptionObserver } from "./types";

/**
 * @public
 **/
export type inferRouterClient<TRouter extends AnyRouter> =
    DecoratedProcedureRecord<TRouter, TRouter["_def"]["record"]>;

type ResolverDef = {
    input: any;
    output: any;
    transformer: boolean;
    errorShape: any;
};

type coerceAsyncGeneratorToIterable<T> = T extends AsyncGenerator<
    infer $T,
    infer $Return,
    infer $Next
>
    ? AsyncIterable<$T, $Return, $Next>
    : T;

/** @internal */
export type Resolver<TDef extends ResolverDef> = (
    input: TDef["input"],
    opts?: ProcedureOptions
) => Promise<coerceAsyncGeneratorToIterable<TDef["output"]>>;

type SubscriptionResolver<TDef extends ResolverDef> = (
    input: TDef["input"],
    opts: Partial<
        CRPCSubscriptionOptions<TDef["output"], CRPCClientError<TDef>>
    > &
        ProcedureOptions
) => Unsubscribable;

type DecorateProcedure<
    TType extends ProcedureType,
    TDef extends ResolverDef
> = TType extends "query"
    ? {
          query: Resolver<TDef>;
      }
    : TType extends "mutation"
    ? {
          mutate: Resolver<TDef>;
      }
    : TType extends "subscription"
    ? {
          subscribe: SubscriptionResolver<TDef>;
      }
    : never;

/**
 * @internal
 */
type DecoratedProcedureRecord<
    TRouter extends AnyRouter,
    TRecord extends RouterRecord
> = {
    [TKey in keyof TRecord]: TRecord[TKey] extends infer $Value
        ? $Value extends RouterRecord
            ? DecoratedProcedureRecord<TRouter, $Value>
            : $Value extends AnyProcedure
            ? DecorateProcedure<
                  $Value["_def"]["type"],
                  {
                      input: inferProcedureInput<$Value>;
                      output: inferTransformedProcedureOutput<
                          inferClientTypes<TRouter>,
                          $Value
                      >;
                      errorShape: inferClientTypes<TRouter>["errorShape"];
                      transformer: inferClientTypes<TRouter>["transformer"];
                  }
              >
            : $Value
        : never;
};

const clientCallTypeMap: Record<
    keyof DecorateProcedure<any, any>,
    ProcedureType
> = {
    query: "query",
    mutate: "mutation",
    subscribe: "subscription",
};

/** @internal */
export const clientCallTypeToProcedureType = (
    clientCallType: string
): ProcedureType => {
    return clientCallTypeMap[clientCallType as keyof typeof clientCallTypeMap];
};

/**
 * Creates a proxy client and shows type errors if you have query names that collide with built-in properties
 */
export type CreateCRPCClient<TRouter extends AnyRouter> =
    inferRouterClient<TRouter> extends infer $Value
        ? UntypedClientProperties & keyof $Value extends never
            ? inferRouterClient<TRouter>
            : IntersectionError<UntypedClientProperties & keyof $Value>
        : never;

/**
 * @internal
 */
export function createCRPCClientProxy<TRouter extends AnyRouter>(
    client: CRPCUntypedClient<TRouter>
): CreateCRPCClient<TRouter> {
    const proxy = createRecursiveProxy<CreateCRPCClient<TRouter>>(
        ({ path, args }) => {
            const pathCopy = [...path];
            const procedureType = clientCallTypeToProcedureType(
                pathCopy.pop()!
            );

            const fullPath = pathCopy.join(".");

            return (client as any)[procedureType](fullPath, ...args);
        }
    );
    return createFlatProxy<CreateCRPCClient<TRouter>>((key) => {
        if (client.hasOwnProperty(key)) {
            return (client as any)[key as any];
        }
        if (key === "__untypedClient") {
            return client;
        }
        return proxy[key];
    });
}

export function createCRPCClient<TRouter extends AnyRouter>(
    opts: CreateCRPCClientOptions<TRouter>
): CreateCRPCClient<TRouter> {
    const client = new CRPCUntypedClient(opts);
    const proxy = createCRPCClientProxy<TRouter>(client);
    return proxy;
}

/**
 * Get an untyped client from a proxy client
 * @internal
 */
export function getUntypedClient<TRouter extends AnyRouter>(
    client: inferRouterClient<TRouter>
): CRPCUntypedClient<TRouter> {
    return (client as any).__untypedClient;
}
