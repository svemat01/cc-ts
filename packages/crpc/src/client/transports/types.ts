import { CRPCClientError } from "../../error/CRPCClientError";
import { CRPCClientOutgoingMessage, CRPCResponseMessage } from "../../rpc";
import { Unsubscribable } from "../../types";

export class CRPCTransportError extends Error {
    constructor(message: string) {
        super(message);

        this.name = "CRPCTransportError";
    }
}

export abstract class CRPCTransport {
    abstract request(
        message: CRPCClientOutgoingMessage
    ): Promise<CRPCResponseMessage>;

    abstract subscribe(
        message: CRPCClientOutgoingMessage,
        onResponse: (response: CRPCResponseMessage) => void,
        onStateChange?: (state: "active" | "inactive" | "pending") => void
    ): CRPCSubscription;
}

export class CRPCSubscription {
    private _state: "active" | "inactive" | "pending" = "pending";

    constructor(
        private _message: CRPCClientOutgoingMessage,
        private _unsubscribe: () => void,
        private _onResponse: (response: CRPCResponseMessage) => void,
        private _onStateChange: (
            state: "active" | "inactive" | "pending"
        ) => void = () => {}
    ) {}

    public async registerSubscription(transport: CRPCTransport) {
        this.setState("pending");
        print("registerSubscription", this._message);
        const result = await transport.request(this._message);

        if ("error" in result) {
            this._state = "inactive";
            throw new CRPCClientError("Failed to start subscription", {
                result,
            });
        }

        if (result.result.type === "started") {
            this._state = "active";
        } else {
            this._state = "inactive";
            throw new CRPCClientError(
                `Subscription not started, got ${result.result.type} response`
            );
        }
    }

    public handleResponse(response: CRPCResponseMessage) {
        this._onResponse?.(response);
    }

    public get message() {
        return this._message;
    }

    public get state() {
        return this._state;
    }

    private setState(state: "active" | "inactive" | "pending") {
        if (this._state === state) return;

        this._state = state;
        this._onStateChange(state);
    }

    /**
     * @internal
     */
    public mark(state: "active" | "inactive") {
        this.setState(state);
    }

    public unsubscribe() {
        this._unsubscribe();
        this.setState("inactive");
    }
}
