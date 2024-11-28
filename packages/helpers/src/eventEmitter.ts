export type EventMap = Record<string, any[]>;

export class EventEmitter<Events extends EventMap = EventMap> {
    private _events: LuaMap<keyof Events, LuaSet<(...args: any[]) => void>> =
        new LuaMap();

    public on<K extends keyof Events>(
        event: K,
        listener: (...args: Events[K]) => void
    ): () => void {
        if (!this._events.has(event)) {
            this._events.set(event, new LuaSet());
        }
        this._events.get(event)!.add(listener);

        return () => this.off(event, listener);
    }

    public once<K extends keyof Events>(
        event: K,
        listener: (...args: Events[K]) => void
    ): () => void {
        const wrapper = (...args: Events[K]) => {
            this.off(event, wrapper);
            listener(...args);
        };
        return this.on(event, wrapper);
    }

    public off<K extends keyof Events>(
        event: K,
        listener: (...args: Events[K]) => void
    ): void {
        const listeners = this._events.get(event);
        if (!listeners) return;
        listeners.delete(listener);
        if (listeners.isEmpty()) {
            this._events.delete(event);
        }
    }

    public emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
        const listeners = this._events.get(event);
        if (!listeners) return;
        for (const listener of listeners) {
            listener(...args);
        }
    }

    public removeAllListeners(event?: keyof Events): void {
        if (event) {
            this._events.delete(event);
        } else {
            for (const [event] of this._events) {
                this._events.delete(event);
            }
        }
    }
}
