/**
 * @module sandcorn
 * @description 🌽 A distributed unique ID generator for ComputerCraft computers
 *
 * Sandcorn (like Snowflake, but for sand computers! 🏖️) generates unique, sortable IDs
 * that are perfect for distributed systems in ComputerCraft. Each ID contains:
 * - Timestamp (hours since epoch)
 * - Machine ID (your computer's ID)
 * - Sequence number (for multiple IDs in the same hour)
 *
 * @example Basic Usage
 * ```typescript
 * const generateId = createSandcornGenerator();
 *
 * // Generate a unique ID
 * const id = generateId();
 * console.log(`Generated ID: ${id}`);
 *
 * // Decode an ID to see its components
 * const decoded = decodeSandcorn(id);
 * console.log(`Created on computer ${decoded.machineId} at hour ${decoded.tick}`);
 * ```
 *
 * @example Custom Timestamp
 * ```typescript
 * const generateId = createSandcornGenerator();
 *
 * // Generate an ID with a specific timestamp
 * const customTime = Math.floor(os.epoch() / 3600);
 * const id = generateId(customTime);
 * ```
 *
 * @warning Sandcorn assumes your computers have unique IDs and relatively synchronized clocks.
 * Time drift between computers may affect ID ordering.
 */

/**
 * Helper function for bitwise left shift in Lua
 * @internal
 */
function blshift(x: number, y: number) {
    return x * Math.pow(2, y);
}

/**
 * Helper function for bitwise right shift in Lua
 * @internal
 */
function brshift(x: number, y: number) {
    return Math.floor(x / Math.pow(2, y));
}

/** Number of bits reserved for machine ID */
const MACHINE_ID_BITS = 12;
/** Number of bits reserved for sequence number */
const SEQUENCE_BITS = 10;

/**
 * Creates a new Sandcorn ID generator for the current computer
 *
 * @returns A function that generates unique Sandcorn IDs
 *
 * @example Setting up a generator
 * ```typescript
 * const generateId = createSandcornGenerator();
 *
 * // Generate IDs for your distributed application
 * function createNewTask(name: string) {
 *     return {
 *         id: generateId(),
 *         name,
 *         createdAt: os.epoch()
 *     };
 * }
 * ```
 */
export function createSandcornGenerator() {
    const machineId = os.getComputerID() + 1;

    let lastTick = 0;
    let seq = 0;

    /**
     * Generates a unique Sandcorn ID
     *
     * @param tick - Optional custom timestamp (hours since epoch)
     * @returns A base36 string representing the unique ID
     *
     * @throws If sequence number exhausted (extremely rare, requires >1024 IDs in same millisecond)
     */
    return (tick: number = Math.floor(os.epoch() / 3600)) => {
        // subtract epoch from received timestamp
        // let tick = tick;

        // generate sequence number
        if (tick <= lastTick) {
            if (seq < Math.pow(2, SEQUENCE_BITS) - 1) {
                tick = lastTick;
                ++seq;
            } else {
                tick = ++lastTick;
                seq = 0;
            }
        } else {
            lastTick = tick;
            seq = 0;
        }

        print("currentTick", tick, "machineId", machineId, "seq", seq);

        // generate sunflake
        // return (currentTime << 10) | (machineId << 10) | seq;
        return (
            blshift(tick, MACHINE_ID_BITS + SEQUENCE_BITS) +
            blshift(machineId, SEQUENCE_BITS) +
            seq
        ).toString(36);
    };
}

/**
 * Decodes a Sandcorn ID into its components
 *
 * @param sandcorn - The Sandcorn ID to decode
 * @returns Object containing the timestamp, machine ID, and sequence number
 *
 * @example Decoding an ID
 * ```typescript
 * const id = generateId();
 * const { tick, machineId, seq } = decodeSandcorn(id);
 *
 * print(`This ID was generated:`);
 * print(`- On computer #${machineId}`);
 * print(`- At hour ${tick} since epoch`);
 * print(`- Was ID #${seq} that hour`);
 * ```
 */
export function decodeSandcorn(sandcorn: string) {
    let _sandcorn = tonumber(sandcorn, 36) || 0;

    const seq = _sandcorn % Math.pow(2, SEQUENCE_BITS);
    _sandcorn = brshift(_sandcorn, SEQUENCE_BITS);
    const machineId = _sandcorn % Math.pow(2, MACHINE_ID_BITS);
    _sandcorn = brshift(_sandcorn, MACHINE_ID_BITS);
    const tick = _sandcorn;

    return { tick, machineId, seq };
}
