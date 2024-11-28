interface ProxyHandler<T> {
    get?(target: T, key: string): any;
    set?(target: T, key: string, value: any): void;
    apply?(target: T, ...args: any[]): any;
}

export function createProxy<T extends object>(
    target: T,
    handler: ProxyHandler<T>
): T {
    const proxy = {} as T;

    const mt = {
        __index: (key: string) => {
            if (handler.get) {
                return handler.get(target, key);
            }
            return target[key];
        },

        __newindex: (key: string, value: any) => {
            if (handler.set) {
                handler.set(target, key, value);
            } else {
                target[key] = value;
            }
        },

        __call: handler.apply,
    };

    setmetatable(proxy, mt);

    return proxy;
}
