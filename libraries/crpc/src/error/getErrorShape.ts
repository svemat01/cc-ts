import type { ProcedureType } from "../procedure";
import type { AnyRootTypes, RootConfig } from "../rootConfig";
import { CRPC_ERROR_CODES_BY_KEY } from "../rpc";
import type { DefaultErrorShape } from "./formatter";
import type { CRPCError } from "./CRPCError";

/**
 * @internal
 */
export function getErrorShape<TRoot extends AnyRootTypes>(opts: {
    config: RootConfig<TRoot>;
    error: CRPCError;
    type: ProcedureType | "unknown";
    path: string | undefined;
    input: unknown;
    ctx: TRoot["ctx"] | undefined;
}): TRoot["errorShape"] {
    const { path, error, config } = opts;
    const { code } = opts.error;
    const shape: DefaultErrorShape = {
        message: error.message,
        code: CRPC_ERROR_CODES_BY_KEY[code],
        data: {
            code,
            httpStatus: 500,
        },
    };
    if (typeof path === "string") {
        shape.data.path = path;
    }
    return config.errorFormatter({ ...opts, shape });
}
