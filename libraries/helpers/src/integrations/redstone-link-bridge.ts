/** @noSelfInFile */

// ============================================
// CC: Redstone Link Bridge - Integration Types
// ============================================

/** @noSelf */
export declare class RedstoneLinkBridgePeripheral implements IPeripheral {
    /**
     * Gets the current signal strength for the given Redstone Link frequency pair.
     * @param freq1 First frequency item ID (e.g. "minecraft:iron_ingot") or "" for empty
     * @param freq2 Second frequency item ID (e.g. "minecraft:redstone") or "" for empty
     * @returns The current signal strength (0-15)
     */
    getLinkSignal(freq1: string, freq2: string): number;

    /**
     * Sends a signal strength to the given Redstone Link frequency pair.
     * @param freq1 First frequency item ID (e.g. "minecraft:iron_ingot") or "" for empty
     * @param freq2 Second frequency item ID (e.g. "minecraft:redstone") or "" for empty
     * @param strength Signal strength to send (0-15)
     */
    sendLinkSignal(freq1: string, freq2: string, strength: number): void;
}

declare module "@cc-ts/helpers/core/types" {
    interface Peripherals {
        redstone_link_bridge: RedstoneLinkBridgePeripheral;
    }
}

export {};
