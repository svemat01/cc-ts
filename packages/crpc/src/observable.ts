export interface Observer<TValue, TError> {
    next: (value: TValue) => void;
    error: (err: TError) => void;
    complete: () => void;
}

export type Observable<TValue, TError = unknown> = {
    subscribe: (observer: Observer<TValue, TError>) => TeardownLogic;
    _observable: true;
};

export type TeardownLogic = (() => void) | void;

export const observable = <TValue, TError = unknown>(
    subscribe: (observer: Observer<TValue, TError>) => TeardownLogic
): Observable<TValue, TError> => ({
    subscribe,
    _observable: true,
});

export const isObservable = <TValue, TError = unknown>(
    value: unknown
): value is Observable<TValue, TError> =>
    typeof value === "object" && value !== null && "_observable" in value;

export type inferObservableValue<T> = T extends Observable<infer V, any>
    ? V
    : never;
