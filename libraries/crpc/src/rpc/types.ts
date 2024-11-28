export type KeyFromValue<
    TValue,
    TType extends Record<PropertyKey, PropertyKey>
> = {
    [K in keyof TType]: TValue extends TType[K] ? K : never;
}[keyof TType];

export type InvertKeyValue<TType extends Record<PropertyKey, PropertyKey>> = {
    [TValue in TType[keyof TType]]: KeyFromValue<TValue, TType>;
};

export type ValueOf<TObj> = TObj[keyof TObj];
