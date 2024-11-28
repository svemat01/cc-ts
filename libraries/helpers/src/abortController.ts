import { setTimeout } from "./scheduler";

export class AbortSignal {
    private _aborted = false;
    private _reason: any;
    public onabort: (() => void) | null = null;
    private _listeners = new LuaSet<(event: { type: "abort" }) => void>();

    constructor() {}

    static abort(reason?: any): AbortSignal {
        const signal = new AbortSignal();
        signal._aborted = true;
        signal._reason = reason;
        return signal;
    }

    static timeout(delay: number): AbortSignal {
        const signal = new AbortSignal();
        setTimeout(() => {
            signal._aborted = true;
            signal._reason = new Error(`Timed out in ${delay}ms.`);
            signal.dispatchEvent();
        }, delay);
        return signal;
    }

    static any(signals: AbortSignal[]): AbortSignal {
        const signal = new AbortSignal();
        for (const s of signals) {
            if (s.aborted) {
                signal._aborted = true;
                signal._reason = s.reason;
                break;
            }
            s.addEventListener(() => {
                if (!signal.aborted) {
                    signal._aborted = true;
                    signal._reason = s.reason;
                    signal.dispatchEvent();
                }
            });
        }
        return signal;
    }

    addEventListener(
        listener: (event: { type: "abort" }) => void,
        options?: { once?: boolean }
    ) {
        if (options?.once) {
            const onceListener = (event: { type: "abort" }) => {
                listener(event);
                this._listeners.delete(onceListener);
            };
            this._listeners.add(onceListener);
        } else {
            this._listeners.add(listener);
        }
    }

    dispatchEvent(_event?: "abort") {
        const event = { type: "abort" as const };
        for (const listener of this._listeners) {
            listener(event);
        }
        if (this.onabort) {
            this.onabort();
        }
    }

    get aborted(): boolean {
        return this._aborted;
    }

    get reason(): any {
        return this._reason;
    }

    throwIfAborted(): void {
        if (this._aborted) {
            throw this._reason;
        }
    }
}

export class AbortController {
    private _signal: AbortSignal;

    constructor() {
        this._signal = new AbortSignal();
    }

    get signal(): AbortSignal {
        return this._signal;
    }

    abort(reason?: any) {
        // @ts-expect-error Set private property
        this._signal._aborted = true;
        // @ts-expect-error Set private property
        this._signal._reason = reason;
        this._signal.dispatchEvent("abort");
    }
}
