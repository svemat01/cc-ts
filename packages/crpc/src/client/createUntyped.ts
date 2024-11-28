import { AbortSignal } from "@cc-ts/helpers/abortController";
import { CRPCClientError } from "../error/CRPCClientError";
import { AnyRouter } from "../router";
import {
    inferAsyncIterableYield,
    Maybe,
    TypeError,
    Unsubscribable,
} from "../types";
import { CRPCTransport } from "./transports/types";
import { InferrableClientTypes } from "../clientish/inferrable";
import { CRPCSubscriptionObserver } from "./types";
import { CRPCResponseMessage } from "../rpc/envelopes";

type CRPCType = "mutation" | "query" | "subscription";
export interface CRPCRequestOptions {
    /**
     * Pass additional context to links
     */
    signal?: AbortSignal;
}

/** @internal */
export type CreateCRPCClientOptions<TRouter extends InferrableClientTypes> = {
    transport: CRPCTransport;
    transformer?: TypeError<"The transformer property has moved to httpLink/httpBatchLink/wsLink">;
};

/** @internal */
export type UntypedClientProperties =
    | "$request"
    | "links"
    | "mutation"
    | "query"
    | "requestAsPromise"
    | "requestId"
    | "runtime"
    | "subscription";

export type CRPCSubscriptionOptions<TValue, TError> = {
    onStarted?: () => void;
    onStopped?: () => void;
    onData?: (data: inferAsyncIterableYield<TValue>) => void;
    onError?: (error: TError) => void;
};

export class CRPCUntypedClient<TRouter extends AnyRouter> {
    private transport: CRPCTransport;
    private requestId: number;

    constructor(opts: CreateCRPCClientOptions<TRouter>) {
        this.requestId = 0;

        this.transport = opts.transport;
    }

    private async requestAsPromise<TInput = unknown, TOutput = unknown>(opts: {
        type: CRPCType;
        input: TInput;
        path: string;
        // signal: Maybe<AbortSignal>;
    }): Promise<TOutput> {
        const result = await this.transport.request({
            method: opts.type,
            id: this.requestId++,
            params: {
                path: opts.path,
                input: opts.input,
            },
        });
        if ("error" in result) {
            print("got error on result", result);
            throw new CRPCClientError(result.error.message, {
                result,
            });
        }
        if (result.result.type !== "data") {
            print("got invalid response type", result);
            throw new Error("Invalid response type", {
                cause: result,
            });
        }
        return result.result.data as TOutput;
    }
    public query(path: string, input?: unknown, opts?: CRPCRequestOptions) {
        return this.requestAsPromise<unknown, unknown>({
            type: "query",
            path,
            input,
            // signal: opts?.signal,
        });
    }
    public mutation(path: string, input?: unknown, opts?: CRPCRequestOptions) {
        return this.requestAsPromise<unknown, unknown>({
            type: "mutation",
            path,
            input,
            // signal: opts?.signal,
        });
    }
    public subscription(
        path: string,
        input: unknown,
        opts: Partial<
            CRPCSubscriptionOptions<unknown, CRPCClientError<AnyRouter>>
        > &
            CRPCRequestOptions
    ) {
        function onResponse(response: CRPCResponseMessage) {
            if ("error" in response) {
                opts.onError?.(
                    new CRPCClientError(response.error.message, {
                        result: response,
                    })
                );
                return;
            }

            switch (response.result.type) {
                case "started": {
                    opts.onStarted?.();
                    break;
                }
                case "stopped": {
                    opts.onStopped?.();
                    break;
                }
                case "data": {
                    opts.onData?.(response.result.data);
                    break;
                }
            }
        }

        return this.transport.subscribe(
            {
                method: "subscription",
                id: this.requestId++,
                params: {
                    path,
                    input,
                },
            },
            onResponse
        );
        // return observable$.subscribe({
        //     next(envelope) {
        //         switch (envelope.result.type) {
        //             case "state": {
        //                 opts.onConnectionStateChange?.(envelope.result);
        //                 break;
        //             }
        //             case "started": {
        //                 opts.onStarted?.({
        //                     context: envelope.context,
        //                 });
        //                 break;
        //             }
        //             case "stopped": {
        //                 opts.onStopped?.();
        //                 break;
        //             }
        //             case "data":
        //             case undefined: {
        //                 opts.onData?.(envelope.result.data);
        //                 break;
        //             }
        //         }
        //     },
        //     error(err) {
        //         opts.onError?.(err);
        //     },
        //     complete() {
        //         opts.onComplete?.();
        //     },
        // });
    }
}

export function createCRPCUntypedClient<TRouter extends AnyRouter>(
    opts: CreateCRPCClientOptions<TRouter>
): CRPCUntypedClient<TRouter> {
    return new CRPCUntypedClient(opts);
}
