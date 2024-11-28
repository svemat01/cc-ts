import {
    asyncSleep,
    escalate,
    on,
    once,
    waitForAnyEvent,
    waitForEvent,
} from "@cc-ts/helpers/scheduler";
import {
    CRPCClientIncomingMessage,
    CRPCClientOutgoingMessage,
    CRPCClientOutgoingStopSubscription,
    CRPCResponseMessage,
} from "../../rpc/envelopes";
import { CRPCSubscription, CRPCTransport } from "./types";

export class WebSocketCRPCTransportError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CRPC WS Error";
    }
}

type WebSocketCRPCTransportOptions = {
    reconnect?: boolean;
    requestTimeout?: number;
    keepAliveTimeout?: number;
    maxReconnectAttempts?: number | "infinite";
    initialBackoffDelay?: number;
    maxBackoffDelay?: number;
    onStateChange?: (
        state: "connecting" | "connected" | "disconnected"
    ) => void;
} & WebSocketOptions;

export class WebSocketCRPCTransport extends CRPCTransport {
    private _websocket: WebSocket | undefined;
    private _state: "connecting" | "connected" | "disconnected" =
        "disconnected";
    private _lastMessage: number = 0;
    private _subscriptions: LuaMap<string | number, CRPCSubscription> =
        new LuaMap();
    private _reconnectAttempts: number = 0;
    private _maxReconnectAttempts: number;
    private _backoffDelay: number;
    private _maxBackoffDelay: number;

    constructor(private opts: WebSocketCRPCTransportOptions) {
        super();
        this._maxReconnectAttempts =
            opts.maxReconnectAttempts === "infinite"
                ? Infinity
                : opts.maxReconnectAttempts ?? 5;
        this._backoffDelay = opts.initialBackoffDelay ?? 1000;
        this._maxBackoffDelay = opts.maxBackoffDelay ?? 30000;

        // this.opts.url = this.opts.url + "#" + os.epoch("utc");

        const success = http.checkURL(
            opts.url.replace("ws://", "http://").replace("wss://", "https://")
        );

        if (!success) {
            throw new WebSocketCRPCTransportError(`Invalid URL: ${error}`);
        }

        on("websocket_closed", (url, reason, code) => {
            print("websocket_closed", url, reason, code);
            if (url !== this.opts.url) return;

            print("CRPC WS: Closed", reason, code);
            this.onDisconnected();
        });

        on("websocket_message", (url, messageIn, binary) => {
            if (url !== this.opts.url) return;
            if (binary) return;

            this._lastMessage = os.epoch("utc");

            if (messageIn === "PING") {
                this.websocket.send("PONG");
                return;
            }

            const response = textutils.unserialiseJSON(messageIn);
            if (typeof response !== "object" || response === null) return;

            if ("id" in response) {
                const subscription = this._subscriptions.get(response.id);
                if (subscription) subscription.handleResponse(response);
            }
        });
    }

    private setState(state: "connecting" | "connected" | "disconnected") {
        this._state = state;
        this.opts.onStateChange?.(state);
    }

    private async handleKeepAlive() {
        if (!this.opts.keepAliveTimeout) return;

        while (this._state === "connected") {
            const timeSinceLastMessage = os.epoch("utc") - this._lastMessage;
            if (timeSinceLastMessage > this.opts.keepAliveTimeout) {
                print(
                    `No messages received for ${timeSinceLastMessage}ms, reconnecting`
                );
                this.websocket.close();
                this.onDisconnected();
                return;
            }
            await asyncSleep(Math.min(this.opts.keepAliveTimeout / 2, 5000));
        }
    }

    public async connect() {
        if (this._state !== "disconnected") {
            throw new WebSocketCRPCTransportError("Already connected");
        }

        try {
            await this.attemptConnection();
        } catch (error) {
            if (this.opts.reconnect) {
                // Start the reconnection process
                this._reconnectAttempts = 1; // Count this failed attempt
                return this.reconnect();
            }
            throw error; // If reconnection is disabled, throw the error to the caller
        }
    }

    private async attemptConnection() {
        this.setState("connecting");
        http.websocketAsync(this.opts.url);

        const [event, _, result] = await waitForAnyEvent(
            ["websocket_success", "websocket_failure"],
            (event, url, _) => url === this.opts.url,
            this.opts.timeout
        );

        if (event === "websocket_failure") {
            this.setState("disconnected");
            throw new WebSocketCRPCTransportError(
                `Connection failed: ${result}`
            );
        } else {
            print("CRPC WS: Connected");

            this._websocket = result as WebSocket;
            this.setState("connected");
            this._lastMessage = os.epoch("utc");

            this.handleKeepAlive();
        }
    }

    private onDisconnected() {
        this.setState("disconnected");
        this._websocket = undefined;

        for (const [_, subscription] of this._subscriptions) {
            subscription.mark("inactive");
        }

        if (this.opts.reconnect) {
            print("CRPC WS: Reconnecting");
            asyncSleep(1000).then(() => this.reconnect());
        }
    }

    private async reconnect(): Promise<void> {
        if (this._state !== "disconnected") {
            throw new WebSocketCRPCTransportError("Already connected");
        }

        while (this._reconnectAttempts < this._maxReconnectAttempts) {
            this.setState("connecting");

            // Exponential backoff with jitter
            const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15
            const delay = Math.min(
                this._backoffDelay * jitter,
                this._maxBackoffDelay
            );
            await asyncSleep(delay);
            this._backoffDelay *= 2;

            try {
                await this.attemptConnection();
                // Reset counters on successful connection
                this._reconnectAttempts = 0;
                this._backoffDelay = this.opts.initialBackoffDelay ?? 1000;
                print("CRPC WS: Reconnected");

                // Recover subscriptions in parallel
                print("CRPC WS: Recovering subscriptions");
                // TSTL doesn't support LuaSet.map for this
                const promises: Promise<void>[] = [];
                for (const [subId, sub] of this._subscriptions) {
                    promises.push(
                        sub.registerSubscription(this).catch((err) => {
                            print(
                                `CRPC WS: Failed to recover subscription: ${err}`
                            );
                            this._subscriptions.delete(subId);
                            sub.mark("inactive");
                        })
                    );
                }
                await Promise.all(promises);
                print("CRPC WS: Recovered subscriptions");
                return; // Successfully reconnected
            } catch (error) {
                this._reconnectAttempts++;
                print(
                    `CRPC WS: Reconnection attempt ${this._reconnectAttempts} failed: ${error}`
                );

                // If this was the last attempt and we're not using infinite retries, throw
                if (
                    this._reconnectAttempts >= this._maxReconnectAttempts &&
                    this._maxReconnectAttempts !== Infinity
                ) {
                    throw new WebSocketCRPCTransportError(
                        `Max reconnection attempts (${this._maxReconnectAttempts}) reached`
                    );
                }
                // Otherwise continue the loop for another attempt
            }
        }
    }

    public get websocket() {
        if (!this._websocket) {
            throw new WebSocketCRPCTransportError("WebSocket not connected");
        }
        return this._websocket;
    }

    async request(
        message: CRPCClientOutgoingMessage
    ): Promise<CRPCResponseMessage> {
        this.websocket.send(textutils.serialiseJSON(message));

        let response: CRPCResponseMessage | undefined;

        await waitForEvent(
            "websocket_message",
            (url, messageIn) => {
                if (url !== this.opts.url) return false;
                const _response = textutils.unserialiseJSON(messageIn);

                if (typeof _response !== "object" || _response === null)
                    return false;
                if ("id" in _response && _response.id !== message.id)
                    return false;
                response = _response as CRPCResponseMessage;
                return true;
            },
            this.opts.requestTimeout
        );

        if (!response) {
            throw new WebSocketCRPCTransportError("No response from server");
        }

        // TODO: Validate response
        return response as CRPCResponseMessage;
    }

    subscribe(
        message: CRPCClientOutgoingMessage,
        onResponse: (response: CRPCResponseMessage) => void,
        onStateChange?: (state: "active" | "inactive" | "pending") => void
    ) {
        if (message.id === null) {
            throw new Error("Subscription ID cannot be null");
        }

        const unsubscribe = () => {
            if (this._state === "connected")
                this.websocket.send(
                    textutils.serialiseJSON({
                        id: message.id,
                        method: "subscription.stop",
                        jsonrpc: "2.0",
                    } satisfies CRPCClientOutgoingStopSubscription)
                );

            if (this._subscriptions.has(message.id!))
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
}
