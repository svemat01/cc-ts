/** @noSelfInFile */

// ============================================
// Create Mod - ComputerCraft Integration Types
// ============================================

/**
 * Represents a package in the Create logistics system.
 * @noSelf
 */
export declare class PackageObject {
    /** Gets the package's address */
    getAddress(): string;
    /** Gets detailed information about an item in the package */
    getItemDetail(slot: number): ItemDetail | undefined;
    /** Gets the OrderDataObject if this is an encoded package */
    getOrderData(): OrderDataObject | undefined;
    /** Checks if the package is currently editable (inside a packager/repackager) */
    isEditable(): boolean;
    /** Lists all items in the package */
    list(): SlotDetail[];
    /** Sets the package's address (only works if editable) */
    setAddress(address: string): void;
}

/**
 * Contains order metadata for encoded packages.
 * @noSelf
 */
export declare class OrderDataObject {
    /** Lists the crafting recipes associated with the order */
    getCrafts(): { count: number; recipe: (string | null)[] }[];
    /** Gets the fragment index of the package */
    getIndex(): number;
    /** Gets detailed information about an item in the complete order (only valid for linkIndex 1) */
    getItemDetail(slot: number): ItemDetail | undefined;
    /** Gets the Link index for this package */
    getLinkIndex(): number;
    /** Gets the order's unique ID */
    getOrderID(): string;
    /** Checks if this is the final package fragment for its index */
    isFinal(): boolean;
    /** Checks if the package is fully assembled and ready to craft */
    isFinalLink(): boolean;
    /** Lists all items required for the complete Encoded Order (only valid for linkIndex 1) */
    list(): SlotDetail[] | undefined;
}

/** @noSelf */
export declare class PackagerPeripheral implements IPeripheral {
    getAddress(): string;
    getItemDetail(slot: number): ItemDetail | undefined;
    getPackage(): PackageObject | undefined;
    list(): SlotDetail[];
    makePackage(): boolean;
    setAddress(address?: string): void;
}

/** @noSelf */
export declare class RePackagerPeripheral implements IPeripheral {
    getAddress(): string;
    getItemDetail(slot: number): ItemDetail | undefined;
    getPackage(): PackageObject | undefined;
    list(): SlotDetail[];
    makePackage(): boolean;
    setAddress(address?: string): void;
}

/** @noSelf */
export declare class StockTickerPeripheral implements IPeripheral {
    getItemDetail(slot: number): ItemDetail | undefined;
    getStockItemDetail(index: number): ItemDetail | undefined;
    list(): { [index: number]: { name: string; count: number; nbt?: string } };
    requestFiltered(address: string, ...filters: any[]): number;
    stock(detailed?: false): SlotDetail[];
    stock(detailed: true): ItemDetail[];
}

/** @noSelf */
export declare class RedstoneRequesterPeripheral implements IPeripheral {
    getAddress(): string;
    getConfiguration(): string;
    getRequest(): ItemDetail[];
    request(): void;
    setAddress(address: string): void;
    setConfiguration(configuration: "strict" | "allow_partial"): void;
    setCraftingRequest(...itemNames: (string | null | undefined)[]): void;
    setRequest(...items: ({ name: string; count?: number } | null | undefined)[]): void;
}

/** @noSelf */
export declare class TableClothPeripheral implements IPeripheral {
    getAddress(): string;
    getPriceTagCount(): number;
    getPriceTagItem(): ItemDetail;
    getWares(): ItemDetail[];
    isShop(): boolean;
    setAddress(address: string): void;
    setPriceTagCount(count?: number): void;
    setPriceTagItem(name?: string): void;
    setWares(...items: ({ name: string; count?: number } | null | undefined)[]): void;
}

/** @noSelf */
export declare class PackageFrogportPeripheral implements IPeripheral {
    getAddress(): string;
    getConfiguration(): string;
    getItemDetail(slot: number): ItemDetail | undefined;
    list(): SlotDetail[];
    setAddress(address: string): void;
    setConfiguration(configuration: "send_recieve" | "send"): void;
}

/** @noSelf */
export declare class PostboxPeripheral implements IPeripheral {
    getAddress(): string;
    getConfiguration(): string;
    getItemDetail(slot: number): ItemDetail | undefined;
    list(): SlotDetail[];
    setAddress(address: string): void;
    setConfiguration(configuration: "send_recieve" | "send"): void;
}

/** @noSelf */
export declare class TrainStationPeripheral implements IPeripheral {
    assemble(): void;
    disassemble(): void;
    setAssemblyMode(assemblyMode: boolean): void;
    isInAssemblyMode(): boolean;
    getStationName(): string;
    setStationName(name: string): void;
    isTrainPresent(): boolean;
    isTrainImminent(): boolean;
    isTrainEnroute(): boolean;
    getTrainName(): string;
    setTrainName(name: string): void;
    hasSchedule(): boolean;
    getSchedule(): any;
    setSchedule(schedule: any): void;
    canTrainReach(destination: string): LuaMultiReturn<[boolean, string?]>;
    distanceTo(destination: string): LuaMultiReturn<[number | undefined, string?]>;
}

/** @noSelf */
export declare class TrainSignalPeripheral implements IPeripheral {
    getState(): string;
    isForcedRed(): boolean;
    setForcedRed(forced: boolean): void;
    getSignalType(): string;
    cycleSignalType(): void;
    listBlockingTrainNames(): string[];
}

/** @noSelf */
export declare class TrainObserverPeripheral implements IPeripheral {
    isTrainPassing(): boolean;
    getPassingTrainName(): string | undefined;
}

/** @noSelf */
export declare class DisplayLinkPeripheral implements IPeripheral {
    getLine(line: number): string;
    setLine(line: number, text: string): void;
}

/** @noSelf */
export declare class SpeedometerPeripheral implements IPeripheral {
    getSpeed(): number;
}

/** @noSelf */
export declare class StressometerPeripheral implements IPeripheral {
    getStress(): number;
    getCapacity(): number;
}

/** @noSelf */
export declare class NixieTubePeripheral implements IPeripheral {
    setText(text: string): void;
}

/** @noSelf */
export declare class StickerPeripheral implements IPeripheral {
    stick(): void;
}

/** @noSelf */
export declare class SequencedGearshiftPeripheral implements IPeripheral {
    getSpeed(): number;
    setSpeed(speed: number): void;
}

/** @noSelf */
export declare class RotationalSpeedControllerPeripheral implements IPeripheral {
    getTargetSpeed(): number;
    setTargetSpeed(speed: number): void;
}

/** @noSelf */
export declare class CreativeMotorPeripheral implements IPeripheral {
    getSpeed(): number;
    setSpeed(speed: number): void;
}

declare module "@cc-ts/helpers/core/types" {
    interface Events {
        /**
         * @see https://wiki.createmod.net/users/cc-tweaked-integration/logistics/packager
         * Sent by: Packager, Re-Packager
         */
        package_created: [pkg: PackageObject];

        /**
         * @see https://wiki.createmod.net/users/cc-tweaked-integration/logistics/packager
         * Sent by: Packager, Re-Packager, Package Frogport, Postbox
         */
        package_received: [pkg: PackageObject];

        /**
         * @see https://wiki.createmod.net/users/cc-tweaked-integration/logistics/repackager
         * Sent by: Re-Packager
         */
        package_repackaged: [packages: PackageObject[], count: number];

        /**
         * @see https://wiki.createmod.net/users/cc-tweaked-integration/logistics/package-frogport
         * Sent by: Package Frogport
         */
        package_sent: [pkg: PackageObject];

        /**
         * @see https://wiki.createmod.net/users/cc-tweaked-integration/train/train-station
         * Sent by: Train Station
         */
        train_imminent: [station: string, train: string];

        /**
         * @see https://wiki.createmod.net/users/cc-tweaked-integration/train/train-station
         * Sent by: Train Station
         */
        train_arrival: [station: string, train: string];

        /**
         * @see https://wiki.createmod.net/users/cc-tweaked-integration/train/train-station
         * Sent by: Train Station
         */
        train_departure: [station: string, train: string];

        /**
         * @see https://wiki.createmod.net/users/cc-tweaked-integration/train/train-signal
         * Sent by: Train Signal
         */
        train_signal_state_change: [side: string, status: string];

        /**
         * @see https://wiki.createmod.net/users/cc-tweaked-integration/train/train-observer
         * Sent by: Train Observer
         */
        train_passing: [train: string];

        /**
         * @see https://wiki.createmod.net/users/cc-tweaked-integration/train/train-observer
         * Sent by: Train Observer
         */
        train_passed: [train: string];
    }

    interface Peripherals {
        create_packager: PackagerPeripheral;
        create_repackager: RePackagerPeripheral;
        create_stock_ticker: StockTickerPeripheral;
        create_redstone_requester: RedstoneRequesterPeripheral;
        create_table_cloth: TableClothPeripheral;
        create_package_frogport: PackageFrogportPeripheral;
        create_postbox: PostboxPeripheral;
        create_train_station: TrainStationPeripheral;
        create_train_signal: TrainSignalPeripheral;
        create_train_observer: TrainObserverPeripheral;
        create_display_link: DisplayLinkPeripheral;
        create_speedometer: SpeedometerPeripheral;
        create_stressometer: StressometerPeripheral;
        create_nixie_tube: NixieTubePeripheral;
        create_sticker: StickerPeripheral;
        create_sequenced_gearshift: SequencedGearshiftPeripheral;
        create_rotational_speed_controller: RotationalSpeedControllerPeripheral;
        create_creative_motor: CreativeMotorPeripheral;
    }
}

export {};
