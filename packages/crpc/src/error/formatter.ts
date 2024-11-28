import type { ProcedureType } from "../procedure";
import type {
    CRPC_ERROR_CODE_KEY,
    CRPC_ERROR_CODE_NUMBER,
    CRPCErrorShape,
} from "../rpc";
import type { CRPCError } from "./CRPCError";

/**
 * @internal
 */
export type ErrorFormatter<TContext, TShape extends CRPCErrorShape> = (opts: {
    error: CRPCError;
    type: ProcedureType | "unknown";
    path: string | undefined;
    input: unknown;
    ctx: TContext | undefined;
    shape: DefaultErrorShape;
}) => TShape;

/**
 * @internal
 */
export type DefaultErrorData = {
    code: CRPC_ERROR_CODE_KEY;
    httpStatus: number;
    /**
     * Path to the procedure that threw the error
     */
    path?: string;
    /**
     * Stack trace of the error (only in development)
     */
    stack?: string;
};

/**
 * @internal
 */
export interface DefaultErrorShape extends CRPCErrorShape<DefaultErrorData> {
    message: string;
    code: CRPC_ERROR_CODE_NUMBER;
}

export const defaultFormatter: ErrorFormatter<any, any> = ({ shape }) => {
    return shape;
};
