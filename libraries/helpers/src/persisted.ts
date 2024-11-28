/**
 * @module persisted
 * @description 💾 Persistent storage manager for ComputerCraft
 *
 * This module provides a simple way to persist data across computer restarts.
 * It handles serialization and file I/O, making it easy to save and load
 * any data structure!
 *
 * @example Basic Usage
 * ```typescript
 * // Create a store for player scores
 * const scores = new PersistedStore("scores", {
 *     player1: 0,
 *     player2: 0
 * });
 *
 * // Load existing data
 * scores.load();
 *
 * // Update and save
 * scores.value.player1 += 10;
 * scores.save();
 * ```
 */

/**
 * Interface for objects that can serialize/unserialize data
 * @typeParam T - Type of data being serialized
 */
export type Serializer<T> = {
    serialize: (value: T) => string;
    unserialize: (value: string) => T;
};

/**
 * Built-in serializer for Set objects
 *
 * @example
 * ```typescript
 * const uniqueNames = new PersistedStore(
 *     "names",
 *     new Set<string>(),
 *     SetSerializer
 * );
 *
 * uniqueNames.value.add("Alice");
 * uniqueNames.save();
 * ```
 */
export const SetSerializer = {
    serialize: (set: Set<unknown>) =>
        textutils.serialize(Array.from(set.values()), {
            compact: true,
        }),
    unserialize: (serializedSet: string) =>
        new Set(textutils.unserialize(serializedSet)),
};

/**
 * Manages persistent storage of data with automatic serialization
 *
 * @typeParam T - Type of data being stored
 *
 * @example Storing Complex Data
 * ```typescript
 * interface Player {
 *     name: string;
 *     inventory: string[];
 *     health: number;
 * }
 *
 * const playerData = new PersistedStore<Player>("player", {
 *     name: "Steve",
 *     inventory: [],
 *     health: 20
 * });
 *
 * // Load saved data
 * playerData.load();
 *
 * // Update and save
 * playerData.value.inventory.push("diamond");
 * playerData.save();
 * ```
 */
export class PersistedStore<T extends any> {
    /**
     * Creates a new persistent store
     *
     * @param name - Filename to store data in (under /persisted/)
     * @param defaultValue - Initial value if no data exists
     * @param serializer - Optional custom serializer (defaults to textutils)
     *
     * @throws If file operations fail
     */
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

    /**
     * Saves current value to disk
     * @throws If file write fails
     */
    save() {
        const [file] = fs.open(`persisted/${this.name}`, "w");
        if (!file) {
            print("Failed to open requests file for writing");
            return;
        }

        file.write(this.serializer.serialize(this.value));
        file.close();
    }

    /**
     * Loads saved value from disk
     * If no saved data exists, keeps the default value
     */
    load() {
        const [file] = fs.open(`persisted/${this.name}`, "r");
        if (!file) {
            print("No requests file found, resetting requests");
            return;
        }

        const data = file.readAll();
        file.close();

        // this.value = textutils.unserialize(data);
        this.value = this.serializer.unserialize(data);
    }
}
