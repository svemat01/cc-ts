import { CRPCErrorResponse } from "../rpc/envelopes";
import type { Maybe } from "../types";
import { isObject } from "../utils";
import type { DefaultErrorShape } from "./formatter";
import type {
    inferClientTypes,
    InferrableClientTypes,
} from "../clientish/inferrable";

type inferErrorShape<TInferrable extends InferrableClientTypes> =
    inferClientTypes<TInferrable>["errorShape"];
export interface CRPCClientErrorBase<TShape extends DefaultErrorShape> {
    readonly message: string;
    readonly shape: Maybe<TShape>;
    readonly data: Maybe<TShape["data"]>;
}
export type CRPCClientErrorLike<TInferrable extends InferrableClientTypes> =
    CRPCClientErrorBase<inferErrorShape<TInferrable>>;

function isCRPCClientError(cause: unknown): cause is CRPCClientError<any> {
    return (
        cause instanceof CRPCClientError ||
        /**
         * @deprecated
         * Delete in next major
         */
        (cause instanceof Error && cause.name === "CRPCClientError")
    );
}

function isCRPCErrorResponse(obj: unknown): obj is CRPCErrorResponse<any> {
    return (
        isObject(obj) &&
        isObject(obj["error"]) &&
        typeof obj["error"]["code"] === "number" &&
        typeof obj["error"]["message"] === "string"
    );
}

function getMessageFromUnknownError(err: unknown, fallback: string): string {
    if (typeof err === "string") {
        return err;
    }
    if (isObject(err) && typeof err["message"] === "string") {
        return err["message"];
    }
    return fallback;
}

export class CRPCClientError<TRouterOrProcedure extends InferrableClientTypes>
    extends Error
    implements CRPCClientErrorBase<inferErrorShape<TRouterOrProcedure>>
{
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore override doesn't work in all environments due to "This member cannot have an 'override' modifier because it is not declared in the base class 'Error'"
    public override readonly cause;
    public readonly shape: Maybe<inferErrorShape<TRouterOrProcedure>>;
    public readonly data: Maybe<inferErrorShape<TRouterOrProcedure>["data"]>;

    /**
     * Additional meta data about the error
     * In the case of HTTP-errors, we'll have `response` and potentially `responseJSON` here
     */
    public meta;

    constructor(
        message: string,
        opts?: {
            result?: Maybe<
                CRPCErrorResponse<inferErrorShape<TRouterOrProcedure>>
            >;
            cause?: Error;
            meta?: Record<string, unknown>;
        }
    ) {
        const cause = opts?.cause;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore https://github.com/tc39/proposal-error-cause
        super(message, { cause });

        this.meta = opts?.meta;

        this.cause = cause;
        this.shape = opts?.result?.error;
        this.data = opts?.result?.error.data;
        this.name = "CRPCClientError";

        // Object.setPrototypeOf(this, CRPCClientError.prototype);
    }

    public static from<TRouterOrProcedure extends InferrableClientTypes>(
        _cause: Error | CRPCErrorResponse<any> | object,
        opts: { meta?: Record<string, unknown> } = {}
    ): CRPCClientError<TRouterOrProcedure> {
        const cause = _cause as unknown;

        if (isCRPCClientError(cause)) {
            if (opts.meta) {
                // Decorate with meta error data
                cause.meta = {
                    ...cause.meta,
                    ...opts.meta,
                };
            }
            return cause;
        }
        if (isCRPCErrorResponse(cause)) {
            return new CRPCClientError(cause.error.message, {
                ...opts,
                result: cause,
            });
        }
        return new CRPCClientError(
            getMessageFromUnknownError(cause, "Unknown error"),
            {
                ...opts,
                cause: cause as any,
            }
        );
    }
}
