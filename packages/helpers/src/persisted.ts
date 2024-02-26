export type Serializer<T> = {
    serialize: (value: T) => string;
    unserialize: (value: string) => T;
}

export const SetSerializer = {
    serialize: (set: Set<unknown>) => textutils.serialize(Array.from(set.values()), {
        compact: true,
    }),
    unserialize: (serializedSet: string) => new Set(textutils.unserialize(serializedSet)),
} 

export class PersistedStore<T extends any> {
    public readonly name: string;
    public value: T;
    private readonly serializer: Serializer<T>;

    constructor(name: string, defaultValue: T, serializer?: Serializer<any>) {
        this.name = name;
        this.value = defaultValue;
        this.serializer = serializer || {
            serialize: (value: T) => textutils.serialize(value),
            unserialize: (value: string) => textutils.unserialize(value),
        };
    }

    save() {

        const [file] = fs.open(`persisted/${this.name}`, 'w');
        if (!file) {
            print('Failed to open requests file for writing');
            return;
        }
    
        file.write(this.serializer.serialize(this.value));
        file.close();
    }

    load() {
        const [file] = fs.open(`persisted/${this.name}`, 'r');
        if (!file) {
            print('No requests file found, resetting requests');
            return;
        }
    
        const data = file.readAll();
        file.close();
    
        // this.value = textutils.unserialize(data);
        this.value = this.serializer.unserialize(data);
    }
}