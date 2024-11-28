import { waitForEvent, asyncSleep, on } from "@cc-ts/helpers/scheduler";
import {
    CRPCClientOutgoingMessage,
    CRPCResponseMessage,
    CRPCClientOutgoingStopSubscription,
} from "../../rpc/envelopes";
import { CRPCSubscription, CRPCTransport } from "./types";

const CLIENT_INSTANCE_ID = os.epoch("utc").toString();

type RednetCRPCTransportOptions = {
    /**
     * Request timeout in milliseconds
     * @default 10_000
     */
    requestTimeout?: number;
    /**
     * Ping interval in milliseconds
     * @default 5000
     */
    pingInterval?: number;
    /**
     * Consider connection lost after this many milliseconds without response
     * @default 15_000
     */
    connectionTimeout?: number;
    /**
     * Called when connection state changes
     */
    onStateChange?: (state: "connected" | "disconnected") => void;
};

export class RednetCRPCTransport extends CRPCTransport {
    private readonly _recipient: number;
    private readonly _options: Required<RednetCRPCTransportOptions>;
    private _currentServerId?: string;
    private _subscriptions: LuaMap<string | number, CRPCSubscription> =
        new LuaMap();
    private _messageListener?: () => void;
    private _lastPingResponse: number = 0;
    private _state: "connected" | "disconnected" = "disconnected";

    constructor(recipient: number, opts: RednetCRPCTransportOptions = {}) {
        super();
        this._recipient = recipient;
        this._options = {
            requestTimeout: opts.requestTimeout ?? 10_000,
            pingInterval: opts.pingInterval ?? 5000,
            connectionTimeout: opts.connectionTimeout ?? 15_000,
            onStateChange: opts.onStateChange ?? (() => {}),
        };
        this._setupMessageListener();
        this._startPingProcess();
    }

    private setState(state: "connected" | "disconnected") {
        if (this._state !== state) {
            this._state = state;
            this._options.onStateChange(state);
        }
    }

    private _setupMessageListener() {
        // Remove old listener
        this._messageListener?.();

        this._messageListener = on(
            "rednet_message",
            (sender, response, protocol) => {
                if (protocol !== "crpc" || sender !== this._recipient) return;

                // Handle ping response
                if (response === "PONG") {
                    this._lastPingResponse = os.epoch("utc");
                    this.setState("connected");
                    return;
                }

                if (typeof response !== "object" || response === null) return;

                // Check for server ID changes
                if ("instance_id" in response) {
                    const newServerId = response.instance_id as string;
                    if (
                        this._currentServerId !== undefined &&
                        this._currentServerId !== newServerId
                    ) {
                        print(
                            "CRPC Rednet: Server restart detected, resubscribing..."
                        );
                        this._currentServerId = newServerId;
                        this._recoverSubscriptions();
                    } else if (this._currentServerId === undefined) {
                        this._currentServerId = newServerId;
                    }
                }

                // Handle subscription responses
                if ("id" in response) {
                    const sub = this._subscriptions.get(response.id as string);
                    if (sub) {
                        sub.handleResponse(response as CRPCResponseMessage);
                    }
                }
            }
        );
    }

    private async _startPingProcess() {
        while (true) {
            await asyncSleep(this._options.pingInterval);
            this._sendPing();
        }
    }

    private _sendPing() {
        rednet.send(this._recipient, "PING", "crpc");

        const currentTime = os.epoch("utc");
        if (
            currentTime - this._lastPingResponse >
            this._options.connectionTimeout
        ) {
            this.setState("disconnected");

            // Mark all subscriptions as inactive when connection is lost
            for (const [_, subscription] of this._subscriptions) {
                subscription.mark("inactive");
            }
        }
    }

    private async _recoverSubscriptions() {
        const promises: Promise<void>[] = [];
        for (const [id, subscription] of this._subscriptions) {
            promises.push(
                subscription.registerSubscription(this).catch((err) => {
                    print(
                        `CRPC Rednet: Failed to recover subscription: ${err}`
                    );
                    this._subscriptions.delete(id);
                    subscription.mark("inactive");
                })
            );
        }
        await Promise.all(promises);
    }

    async request(
        message: CRPCClientOutgoingMessage
    ): Promise<CRPCResponseMessage> {
        rednet.send(
            this._recipient,
            {
                ...message,
                instance_id: CLIENT_INSTANCE_ID,
            },
            "crpc"
        );
        const [_, response] = await waitForEvent(
            "rednet_message",
            (sender, response, protocol) => {
                if (protocol !== "crpc") return false;
                if (sender !== this._recipient) return false;
                if (typeof response !== "object" || response === null)
                    return false;
                if ("id" in response && response.id !== message.id)
                    return false;
                return true;
            },
            this._options.requestTimeout
        );
        return response as CRPCResponseMessage;
    }

    subscribe(
        message: CRPCClientOutgoingMessage,
        onResponse: (response: CRPCResponseMessage) => void,
        onStateChange?: (state: "active" | "inactive" | "pending") => void
    ): CRPCSubscription {
        if (message.id === null) {
            throw new Error("Subscription ID cannot be null");
        }

        const unsubscribe = () => {
            rednet.send(
                this._recipient,
                {
                    id: message.id,
                    method: "subscription.stop",
                    jsonrpc: "2.0",
                } satisfies CRPCClientOutgoingStopSubscription,
                "crpc"
            );

            this._subscriptions.delete(message.id!);
            subscription.mark("inactive");
        };

        const subscription = new CRPCSubscription(
            message,
            unsubscribe,
            onResponse,
            onStateChange
        );
        this._subscriptions.set(message.id, subscription);

        subscription.registerSubscription(this);

        return subscription;
    }

    public get state(): "connected" | "disconnected" {
        return this._state;
    }
}
