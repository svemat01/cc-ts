import { pretty } from "cc.pretty";
import { Events } from "./types";

class EventHandler<
    _Events extends Record<string, any[]>,
    T extends keyof _Events = keyof _Events
> {
    constructor(
        private _handler: (...args: _Events[T]) => Promise<void> | void,
        private _filter: ((...args: _Events[T]) => boolean) | null = null,
        private _once: boolean = false
    ) {}

    public get handler() {
        return this._handler;
    }

    public get filter() {
        return this._filter;
    }

    public get once() {
        return this._once;
    }
}

export class EventManager<_Events extends Record<string, any[]>> {
    private eventHandlers: LuaMap<keyof _Events, LuaSet<EventHandler<_Events>>>;

    constructor() {
        this.eventHandlers = new LuaMap();
    }

    public on<T extends keyof _Events>(
        name: T,
        handlerFunction: (...args: _Events[T]) => Promise<void> | void,
        filter: ((...args: _Events[T]) => boolean) | null = null,
        once: boolean = false
    ) {
        const handlers =
            this.eventHandlers.get(name) ??
            new LuaSet<EventHandler<_Events, T>>();
        const eventHandler = new EventHandler(handlerFunction, filter, once);
        handlers.add(eventHandler);
        this.eventHandlers.set(name, handlers);

        return () => this.off(name, eventHandler);
    }

    public once<T extends keyof _Events>(
        name: T,
        handlerFunction: (...args: _Events[T]) => Promise<void> | void,
        filter: ((...args: _Events[T]) => boolean) | null = null
    ) {
        return this.on(name, handlerFunction, filter, true);
    }

    protected off<T extends keyof _Events>(
        name: T,
        handler: EventHandler<_Events, T>
    ) {
        const handlers = this.eventHandlers.get(name);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    public waitForEvent<T extends keyof _Events>(
        name: T,
        check: (...args: _Events[T]) => boolean = () => true,
        timeout: number = 0
    ) {
        return new Promise<_Events[T]>((_resolve, reject) => {
            if (timeout <= 0) {
                this.once(name, (...args) => _resolve(args), check);

                return;
            }

            const timeoutId = os.startTimer(timeout);

            let disableTimeout: () => void;
            let unsubscribe = this.once(
                name,
                (...args) => {
                    disableTimeout && disableTimeout();
                    os.cancelTimer(timeoutId);
                    _resolve(args);
                },
                check
            );
            disableTimeout = osEvents.once(
                "timer",
                () => {
                    unsubscribe();
                    reject(`Event ${name as string} timed out`);
                },
                (id) => {
                    return id === timeoutId;
                }
            );
        });
    }

    public waitForAnyEvent<T extends keyof _Events>(
        names: T[],
        check: (event: T, ...args: _Events[T]) => boolean = () => true,
        timeout: number = 0
    ) {
        return new Promise<[T, ..._Events[T]]>((_resolve, reject) => {
            if (timeout <= 0) {
                for (const name of names) {
                    this.once(
                        name,
                        (...args) => _resolve([name, ...args]),
                        (...args) => check(name, ...args)
                    );
                }

                return;
            }

            const timeoutId = os.startTimer(timeout);

            let disableTimeout: () => void;
            let unsubscribe = names.map((name) =>
                this.once(
                    name,
                    (...args) => {
                        disableTimeout && disableTimeout();
                        os.cancelTimer(timeoutId);
                        _resolve([name, ...args]);
                    },
                    (...args) => check(name, ...args)
                )
            );
            disableTimeout = osEvents.once(
                "timer",
                () => {
                    unsubscribe.forEach((unsubscribe) => unsubscribe());
                    reject(`Event ${names.join(", ")} timed out`);
                },
                (id) => {
                    return id === timeoutId;
                }
            );
        });
    }

    public async dispatch<T extends keyof _Events>(
        name: T,
        ...args: _Events[T]
    ) {
        const handlers = this.eventHandlers.get(name);
        if (handlers) {
            for (const handler of handlers) {
                if (handler.filter && !handler.filter(...args)) continue;

                const failed = await handler.handler(...args)?.catch((err) => {
                    if (err instanceof Panic) {
                        throw err;
                    }

                    print("CCS | Dispatch error:", err);
                    return true;
                });

                if (handler.once === true && !failed) {
                    // print("deleting", name);
                    handlers.delete(handler);
                }
            }

            this.eventHandlers.set(name, handlers);
        }
    }
}

export class Panic extends Error {
    name = "CTS_PANIC";
}

export const osEvents = new EventManager<Events>();
export const on = osEvents.on.bind(osEvents) as typeof osEvents.on;
export const once = osEvents.once.bind(osEvents) as typeof osEvents.once;
export const waitForEvent = osEvents.waitForEvent.bind(
    osEvents
) as typeof osEvents.waitForEvent;
export const waitForAnyEvent = osEvents.waitForAnyEvent.bind(
    osEvents
) as typeof osEvents.waitForAnyEvent;
export const dispatch = osEvents.dispatch.bind(
    osEvents
) as typeof osEvents.dispatch;

export const asyncSleep = async (ms: number) => {
    const timer = os.startTimer(ms / 1000);
    await waitForEvent("timer", (id) => id === timer);
    return;
};

export const setTimeout = (func: () => void, ms: number) => {
    asyncSleep(ms).then(func);
};

/**
 * Used to make promises throw the errors instead of ignoring them
 * @example
 * ```ts
 * await waitForEvent(...).catch(escalate);
 * ```
 */
export const escalate = (error: unknown) => {
    if (error instanceof Error) {
        throw error;
    }
    throw new Error(`${error}`);
};

export const PANIC = (message: string, cause?: unknown) => {
    print("CTS | Panicking:", message);
    throw new Panic(message, { cause });
};

export const runOsEventLoop = (raw = false, debug = false) => {
    print("CTS | Running OS event loop");

    let error: Error | undefined;
    while (!error) {
        const [event, ...args] = raw ? os.pullEventRaw() : os.pullEvent();
        debug && print("CTS | Event:", event, pretty(args));
        dispatch(event, ...args).catch((err) => {
            error = err;
        });
    }

    if (!(error instanceof Panic)) {
        print("CTS | Error in OS event loop, exiting...");
    }

    throw error;
};
