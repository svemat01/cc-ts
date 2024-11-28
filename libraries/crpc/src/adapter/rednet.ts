import { AnyRouter, callProcedure } from "../router";
import { on } from "@cc-ts/helpers/scheduler";
import { AbortController } from "@cc-ts/helpers/abortController";
import {
    CRPCClientOutgoingMessage,
    CRPCResponseMessage,
    CRPCResultMessage,
} from "../rpc/envelopes";
import { CRPCError, getCRPCErrorFromUnknown } from "../error/CRPCError";
import { isAsyncIterable, isObject, run } from "../utils";
import { getErrorShape } from "../error/getErrorShape";
import { transformCRPCResponse } from "../transformer";
import { parseCRPCMessage } from "../rpc/parseCRPCMessage";
import { isObservable } from "../observable";

const SERVER_INSTANCE_ID = os.epoch("utc").toString();

export const CRPC_PROTOCOL = "crpc";

/**
 * Web socket server handler
 */
export type RednetHandlerOptions<TRouter extends AnyRouter> = {
    router: TRouter;
    // keepAlive?: {
    //     /**
    //      * Enable heartbeat messages
    //      * @default false
    //      */
    //     enabled: boolean;
    //     /**
    //      * Heartbeat interval in milliseconds
    //      * @default 30_000
    //      */
    //     pingMs?: number;
    //     /**
    //      * Terminate the WebSocket if no pong is received after this many milliseconds
    //      * @default 5_000
    //      */
    //     pongWaitMs?: number;
    // };
    // /**
    //  * Disable responding to ping messages from the client
    //  * **Not recommended** - this is mainly used for testing
    //  * @default false
    //  */
    // dangerouslyDisablePong?: boolean;
};

const clients = new LuaMap<
    number,
    {
        instanceId: string;
        subscriptions: LuaMap<number | string, AbortController>;
    }
>();

function respond(
    recipient: number,
    router: AnyRouter,
    untransformedJSON: CRPCResponseMessage
) {
    const transformedJSON = transformCRPCResponse(
        router._def._config,
        untransformedJSON
    );

    rednet.send(
        recipient,
        Array.isArray(transformedJSON)
            ? transformedJSON.map((item) => ({
                  ...item,
                  instance_id: SERVER_INSTANCE_ID,
              }))
            : {
                  ...transformedJSON,
                  instance_id: SERVER_INSTANCE_ID,
              },
        CRPC_PROTOCOL
    );
}

async function handleRequest(
    sender: number,
    router: AnyRouter,
    msg: CRPCClientOutgoingMessage
) {
    const { id, jsonrpc } = msg;
    const ctx = undefined;

    /* istanbul ignore next -- @preserve */
    if (id === null) {
        throw new CRPCError({
            code: "BAD_REQUEST",
            message: "`id` is required",
        });
    }

    let clientData = clients.get(sender);
    if (!clientData) {
        clientData = {
            instanceId: SERVER_INSTANCE_ID,
            subscriptions: new LuaMap(),
        };
        clients.set(sender, clientData);
    }

    if ("instance_id" in msg) {
        const currentClientId = clientData.instanceId;
        const newClientId = msg.instance_id as string;
        if (currentClientId !== undefined && currentClientId !== newClientId) {
            print("CRPC Rednet: Client restart detected, resubscribing...");
            clientData.instanceId = newClientId;
        } else if (currentClientId === undefined) {
            clientData.instanceId = newClientId;
        }
    }

    if (msg.method === "subscription.stop") {
        clientData.subscriptions.get(id)?.abort();
        return;
    }

    const { path, lastEventId } = msg.params;
    let { input } = msg.params;
    const type = msg.method;
    try {
        if (lastEventId !== undefined) {
            if (isObject(input)) {
                input = {
                    ...input,
                    lastEventId: lastEventId,
                };
            } else {
                input ??= {
                    lastEventId: lastEventId,
                };
            }
        }

        const abortController = new AbortController();
        const result = await callProcedure({
            procedures: router._def.procedures,
            path,
            input,
            getRawInput: async () => input,
            ctx: undefined,
            type,
            // signal: abortController.signal,
        });

        const isObservableResult = isObservable(result);

        if (type !== "subscription") {
            if (isObservableResult) {
                throw new CRPCError({
                    code: "UNSUPPORTED_MEDIA_TYPE",
                    message: `Cannot return an observable from a ${type} procedure`,
                });
            }
            // send the value as data if the method is not a subscription
            respond(sender, router, {
                id,
                jsonrpc,
                result: {
                    type: "data",
                    data: result,
                },
            });
            return;
        }

        if (!isObservableResult) {
            throw new CRPCError({
                message: `Subscription ${path} did not return an observable`,
                code: "INTERNAL_SERVER_ERROR",
            });
        }

        // /* istanbul ignore next -- @preserve */
        if (clientData.subscriptions.has(id)) {
            // duplicate request ids for client

            throw new CRPCError({
                message: `Duplicate id ${id}`,
                code: "BAD_REQUEST",
            });
        }

        let isStopped = false;

        const unsubscribe = result.subscribe({
            next(value) {
                if (isStopped) return;
                respond(sender, router, {
                    id,
                    jsonrpc,
                    result: {
                        type: "data",
                        data: value,
                    },
                });
            },
            error(_error) {
                if (isStopped) return;
                isStopped = true;
                const error = getCRPCErrorFromUnknown(_error);
                respond(sender, router, {
                    id,
                    jsonrpc,
                    error: getErrorShape({
                        config: router._def._config,
                        error,
                        type,
                        path,
                        input,
                        ctx,
                    }),
                });
            },
            complete() {
                if (isStopped) return;
                isStopped = true;
                respond(sender, router, {
                    id,
                    jsonrpc,
                    result: {
                        type: "stopped",
                    },
                });
            },
        });

        const iterable = result;

        const iterator: AsyncIterator<unknown, any, any> =
            // @ts-expect-error - Typescript to lua uses Symbol.iterator instead of Symbol.asyncIterator
            iterable[Symbol.iterator]();

        const abortPromise = new Promise<"abort">((resolve) => {
            abortController.signal.onabort = () => resolve("abort");
        });

        run(async () => {
            // We need those declarations outside the loop for garbage collection reasons. If they
            // were declared inside, they would not be freed until the next value is present.
            let next:
                | null
                | CRPCError
                | Awaited<
                      | typeof abortPromise
                      | ReturnType<(typeof iterator)["next"]>
                  >;
            let result: null | CRPCResultMessage<unknown>["result"];

            while (true) {
                next = await Promise.race([
                    iterator.next().catch(getCRPCErrorFromUnknown),
                    abortPromise,
                ]);

                if (next === "abort") {
                    await iterator.return?.();
                    break;
                }
                if (next instanceof Error) {
                    const error = getCRPCErrorFromUnknown(next);
                    // opts.onError?.({ error, path, type, ctx, req, input });
                    respond(sender, router, {
                        id,
                        jsonrpc,
                        error: getErrorShape({
                            config: router._def._config,
                            error,
                            type,
                            path,
                            input,
                            ctx,
                        }),
                    });
                    break;
                }
                if (next.done) {
                    break;
                }

                result = {
                    type: "data",
                    data: next.value,
                };

                // if (isTrackedEnvelope(next.value)) {
                //     const [id, data] = next.value;
                //     result.id = id;
                //     result.data = {
                //         id,
                //         data,
                //     };
                // }

                respond(sender, router, {
                    id,
                    jsonrpc,
                    result,
                });

                // free up references for garbage collection
                next = null;
                result = null;
            }

            await iterator.return?.();
            respond(sender, router, {
                id,
                jsonrpc,
                result: {
                    type: "stopped",
                },
            });
            // clientSubscriptions.delete(id);
        }).catch((cause) => {
            const error = getCRPCErrorFromUnknown(cause);
            // opts.onError?.({ error, path, type, ctx, req, input });
            respond(sender, router, {
                id,
                jsonrpc,
                error: getErrorShape({
                    config: router._def._config,
                    error,
                    type,
                    path,
                    input,
                    ctx,
                }),
            });
            abortController.abort();
        });
        // clientSubscriptions.set(id, abortController);

        respond(sender, router, {
            id,
            jsonrpc,
            result: {
                type: "started",
            },
        });
    } catch (cause) /* istanbul ignore next -- @preserve */ {
        // procedure threw an error
        const error = getCRPCErrorFromUnknown(cause);
        // opts.onError?.({ error, path, type, ctx, req, input });
        respond(sender, router, {
            id,
            jsonrpc,
            error: getErrorShape({
                config: router._def._config,
                error,
                type,
                path,
                input,
                ctx,
            }),
        });
    }
}

export const createRednetCRPCServer = <TRouter extends AnyRouter>(
    opts: RednetHandlerOptions<TRouter>
) => {
    const { router } = opts;

    print("CRPC: Registering Rednet Handler");

    on("rednet_message", async (sender, message, protocol) => {
        if (protocol !== "crpc") return;

        if (message === "PING") {
            rednet.send(sender, "PONG", CRPC_PROTOCOL);
            return;
        }

        try {
            const msgs: unknown[] = Array.isArray(message)
                ? message
                : [message];
            await Promise.all(
                msgs
                    .map((raw) =>
                        parseCRPCMessage(raw, router._def._config.transformer)
                    )
                    .map((msg) => handleRequest(sender, router, msg))
            );
        } catch (cause) {
            const error = new CRPCError({
                code: "PARSE_ERROR",
                cause,
            });

            respond(sender, router, {
                id: null,
                error: getErrorShape({
                    config: router._def._config,
                    error,
                    type: "unknown",
                    path: undefined,
                    input: undefined,
                    ctx: undefined,
                }),
            });
        }
    });
};
