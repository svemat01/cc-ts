import type { ProcedureType } from "../procedure";
import type { CRPC_ERROR_CODE_NUMBER } from "./codes";

/**
 * Error response
 */
export interface CRPCErrorShape<TData extends object = object> {
    code: CRPC_ERROR_CODE_NUMBER;
    message: string;
    data: TData;
}

/**
 * JSON-RPC 2.0 Specification
 */
export namespace JSONRPC2 {
    export type RequestId = number | string | null;

    /**
     * All requests/responses extends this shape
     */
    export interface BaseEnvelope {
        id?: RequestId;
        jsonrpc?: "2.0";
    }

    export interface BaseRequest<TMethod extends string = string>
        extends BaseEnvelope {
        method: TMethod;
    }

    export interface Request<TMethod extends string = string, TParams = unknown>
        extends BaseRequest<TMethod> {
        params: TParams;
    }

    export interface ResultResponse<TResult = unknown> extends BaseEnvelope {
        result: TResult;
    }

    export interface ErrorResponse<
        TError extends CRPCErrorShape = CRPCErrorShape
    > extends BaseEnvelope {
        error: TError;
    }
}

/////////////////////////// HTTP envelopes ///////////////////////

export interface CRPCRequest
    extends JSONRPC2.Request<
        ProcedureType,
        {
            path: string;
            input: unknown;
            /**
             * The last event id that the client received
             */
            lastEventId?: string;
        }
    > {}

export interface CRPCResult<TData = unknown> {
    data: TData;
    type?: "data";
    /**
     * The id of the message to keep track of in case of a reconnect
     */
    id?: string;
}

export interface CRPCSuccessResponse<TData>
    extends JSONRPC2.ResultResponse<CRPCResult<TData>> {}

export interface CRPCErrorResponse<
    TError extends CRPCErrorShape = CRPCErrorShape
> extends JSONRPC2.ErrorResponse<TError> {}

export type CRPCResponse<
    TData = unknown,
    TError extends CRPCErrorShape = CRPCErrorShape
> = CRPCErrorResponse<TError> | CRPCSuccessResponse<TData>;

/////////////////////////// WebSocket envelopes ///////////////////////

export type CRPCRequestMessage = CRPCRequest & {
    id: JSONRPC2.RequestId;
};

/**
 * The client asked the server to unsubscribe
 */
export interface CRPCSubscriptionStopNotification
    extends JSONRPC2.BaseRequest<"subscription.stop"> {
    id: null;
}

/**
 * The client's outgoing request types
 */
export type CRPCClientOutgoingRequest = CRPCSubscriptionStopNotification;

export type CRPCClientOutgoingStopSubscription =
    JSONRPC2.BaseRequest<"subscription.stop"> & { id: JSONRPC2.RequestId };

/**
 * The client's sent messages shape
 */
export type CRPCClientOutgoingMessage =
    | CRPCRequestMessage
    | CRPCClientOutgoingStopSubscription;

export interface CRPCResultMessage<TData>
    extends JSONRPC2.ResultResponse<
        | { type: "started"; data?: never }
        | { type: "stopped"; data?: never }
        | CRPCResult<TData>
    > {}

export type CRPCResponseMessage<
    TData = unknown,
    TError extends CRPCErrorShape = CRPCErrorShape
> = { id: JSONRPC2.RequestId } & (
    | CRPCErrorResponse<TError>
    | CRPCResultMessage<TData>
);

/**
 * The server asked the client to reconnect - useful when restarting/redeploying service
 */
export interface CRPCReconnectNotification
    extends JSONRPC2.BaseRequest<"reconnect"> {
    id: JSONRPC2.RequestId;
}

/**
 * The client's incoming request types
 */
export type CRPCClientIncomingRequest = CRPCReconnectNotification;

/**
 * The client's received messages shape
 */
export type CRPCClientIncomingMessage<
    TResult = unknown,
    TError extends CRPCErrorShape = CRPCErrorShape
> = CRPCClientIncomingRequest | CRPCResponseMessage<TResult, TError>;

/**
 * The client sends connection params - always sent as the first message
 */
export interface CRPCConnectionParamsMessage
    extends JSONRPC2.BaseRequest<"connectionParams"> {
    data: Record<string, string> | null;
}
