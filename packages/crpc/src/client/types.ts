import { inferTransformedProcedureOutput } from "../clientish/inference";
import { inferClientTypes } from "../clientish/inferrable";
import { CRPCClientError } from "../error/CRPCClientError";
import type {
    AnyProcedure,
    AnyQueryProcedure,
    inferProcedureInput,
    ProcedureOptions,
    ProcedureType,
} from "../procedure";
import type { AnyRouter, RouterRecord } from "../router";
import { inferAsyncIterableYield, Unsubscribable } from "../types";

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
        CRPCSubscriptionObserver<TDef["output"], CRPCClientError<TDef>>
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
type JoinPath<TKey extends string, TSuffix extends string> = TKey extends ""
    ? TSuffix
    : `${TKey}.${TSuffix}`;

export type GetPathsForRouter<
    TRecord extends RouterRecord,
    TPrefix extends string = ""
> = {
    [TKey in keyof TRecord]: TRecord[TKey] extends infer $Value
        ? $Value extends RouterRecord
            ? GetPathsForRouter<
                  $Value,
                  JoinPath<TPrefix & string, TKey & string>
              >
            : $Value extends AnyProcedure
            ? JoinPath<TPrefix & string, TKey & string>
            : never
        : never;
}[keyof TRecord];

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
            : never
        : never;
};

export type GetProcedureByPath<
    TRecord extends RouterRecord,
    TPath extends string
> = TPath extends `${infer TKey}.${infer TRest}`
    ? TRecord[TKey] extends RouterRecord
        ? GetProcedureByPath<TRecord[TKey], TRest>
        : never
    : TRecord[TPath];

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never;

/**
 * Creates a flat map of procedure paths to their corresponding procedures
 */
export type FlattenedProcedureMap<
    TRouter extends AnyRouter | RouterRecord,
    TRecord extends RouterRecord = TRouter extends AnyRouter
        ? TRouter["_def"]["record"]
        : TRouter,
    TPrefix extends string = ""
> = UnionToIntersection<
    {
        [TKey in keyof TRecord]: TRecord[TKey] extends infer $Value
            ? $Value extends RouterRecord
                ? FlattenedProcedureMap<
                      $Value,
                      $Value,
                      JoinPath<TPrefix & string, TKey & string>
                  >
                : $Value extends AnyProcedure
                ? {
                      [TPath in JoinPath<
                          TPrefix & string,
                          TKey & string
                      >]: DecorateProcedure<
                          $Value["_def"]["type"],
                          {
                              input: inferProcedureInput<$Value>;
                              output: inferTransformedProcedureOutput<
                                  inferClientTypes<
                                      TRouter extends AnyRouter
                                          ? TRouter
                                          : never
                                  >,
                                  $Value
                              >;
                              errorShape: inferClientTypes<
                                  TRouter extends AnyRouter ? TRouter : never
                              >["errorShape"];
                              transformer: inferClientTypes<
                                  TRouter extends AnyRouter ? TRouter : never
                              >["transformer"];
                          }
                      >;
                  }
                : never
            : never;
    }[keyof TRecord]
>;

type SimplifiedProcedure<
    TType extends ProcedureType,
    TInput,
    TOutput,
    TErrorShape,
    TTransformer
> = {
    type: TType;
    input: TInput;
    output: TOutput;
    errorShape: TErrorShape;
    transformer: TTransformer;
};

type AnySimplifiedProcedure = SimplifiedProcedure<any, any, any, any, any>;

export type FlattenRouterRecord<
    TRouter extends AnyRouter,
    TRecord extends TRouter["_def"]["record"] = TRouter["_def"]["record"],
    TPrefix extends string = ""
> = UnionToIntersection<
    {
        [TKey in keyof TRecord]: TRecord[TKey] extends infer $Value
            ? $Value extends RouterRecord
                ? FlattenRouterRecord<
                      TRouter,
                      $Value,
                      JoinPath<TPrefix & string, TKey & string>
                  >
                : $Value extends AnyProcedure
                ? {
                      [TPath in JoinPath<
                          TPrefix & string,
                          TKey & string
                      >]: SimplifiedProcedure<
                          $Value["_def"]["type"],
                          inferProcedureInput<$Value>,
                          inferTransformedProcedureOutput<
                              inferClientTypes<
                                  TRouter extends AnyRouter ? TRouter : never
                              >,
                              $Value
                          >,
                          inferClientTypes<
                              TRouter extends AnyRouter ? TRouter : never
                          >["errorShape"],
                          inferClientTypes<
                              TRouter extends AnyRouter ? TRouter : never
                          >["transformer"]
                      >;
                  }
                : never
            : never;
    }[keyof TRecord]
>;

type ExtractProcedureType<TProcedures, TType extends ProcedureType> = {
    [key in keyof TProcedures as TProcedures[key] extends { type: TType }
        ? key
        : never]: TProcedures[key];
};

export type Client<
    TRouter extends AnyRouter,
    TProcedures extends FlattenRouterRecord<TRouter> = FlattenRouterRecord<TRouter>
> = {
    // [TPath in keyof TProcedures]: TProcedures[TPath];
    query<
        TPath extends keyof ExtractProcedureType<TProcedures, "query">,
        TProcedure extends AnySimplifiedProcedure = TProcedures[TPath] extends AnySimplifiedProcedure
            ? TProcedures[TPath]
            : never
    >(
        path: TPath,
        input: TProcedure["input"]
    ): TProcedure["output"];
};

export interface CRPCSubscriptionObserver<TValue, TError> {
    onStarted: (opts: { context: any | undefined }) => void;
    onData: (value: inferAsyncIterableYield<TValue>) => void;
    onError: (err: TError) => void;
    onStopped: () => void;
    onComplete: () => void;
    onConnectionStateChange: (state: any) => void;
}
