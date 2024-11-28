import { AnyRootTypes } from "./rootConfig";

import { RootConfig } from "./rootConfig";
import { CRPCResponseMessage } from "./rpc/envelopes";

import { CRPCResponse } from "./rpc/envelopes";

/**
 * @public
 */
export interface DataTransformer {
    serialize: (object: any) => any;
    deserialize: (object: any) => any;
}

interface InputDataTransformer extends DataTransformer {
    /**
     * This function runs **on the client** before sending the data to the server.
     */
    serialize: (object: any) => any;
    /**
     * This function runs **on the server** to transform the data before it is passed to the resolver
     */
    deserialize: (object: any) => any;
}

interface OutputDataTransformer extends DataTransformer {
    /**
     * This function runs **on the server** before sending the data to the client.
     */
    serialize: (object: any) => any;
    /**
     * This function runs **only on the client** to transform the data sent from the server.
     */
    deserialize: (object: any) => any;
}

/**
 * @public
 */
export interface CombinedDataTransformer {
    /**
     * Specify how the data sent from the client to the server should be transformed.
     */
    input: InputDataTransformer;
    /**
     * Specify how the data sent from the server to the client should be transformed.
     */
    output: OutputDataTransformer;
}

/**
 * @public
 */
export type DataTransformerOptions = CombinedDataTransformer | DataTransformer;

/**
 * @internal
 */
export function getDataTransformer(
    transformer: DataTransformerOptions
): CombinedDataTransformer {
    if ("input" in transformer) {
        return transformer;
    }
    return { input: transformer, output: transformer };
}

/**
 * @internal
 */
export const defaultTransformer: CombinedDataTransformer = {
    input: { serialize: (obj) => obj, deserialize: (obj) => obj },
    output: { serialize: (obj) => obj, deserialize: (obj) => obj },
};

function transformCRPCResponseItem<
    TResponseItem extends CRPCResponse | CRPCResponseMessage
>(config: RootConfig<AnyRootTypes>, item: TResponseItem): TResponseItem {
    if ("error" in item) {
        return {
            ...item,
            error: config.transformer.output.serialize(item.error),
        };
    }

    if ("data" in item.result) {
        return {
            ...item,
            result: {
                ...item.result,
                data: config.transformer.output.serialize(item.result.data),
            },
        };
    }

    return item;
}

/**
 * Takes a unserialized `CRPCResponse` and serializes it with the router's transformers
 **/
export function transformCRPCResponse<
    TResponse extends
        | CRPCResponse
        | CRPCResponse[]
        | CRPCResponseMessage
        | CRPCResponseMessage[]
>(config: RootConfig<AnyRootTypes>, itemOrItems: TResponse) {
    return Array.isArray(itemOrItems)
        ? itemOrItems.map((item) => transformCRPCResponseItem(config, item))
        : transformCRPCResponseItem(config, itemOrItems);
}
