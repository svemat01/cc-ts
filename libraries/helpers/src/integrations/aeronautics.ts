/** @noSelfInFile */

// ============================================
// Create Aeronautics - ComputerCraft Integration Types
// ============================================

/** @noSelf */
export declare class AltitudeSensorPeripheral implements IPeripheral {
    getType(): "altitude_sensor";
    getHeight(): number;
    getAirPressure(): number;
}

/** @noSelf */
export declare class VelocitySensorPeripheral implements IPeripheral {
    getType(): "velocity_sensor";
    getVelocity(): number;
}

/** @noSelf */
export declare class GimbalSensorPeripheral implements IPeripheral {
    getType(): "gimbal_sensor";
    getAngles(): LuaMultiReturn<[number, number]>;
    getAnglesRad(): LuaMultiReturn<[number, number]>;
}

/** @noSelf */
export declare class DirectionalLinkPeripheral implements IPeripheral {
    getType(): "directional_link";
    getClosestAngle(): number;
    getClosestAngleRad(): number;
}

/** @noSelf */
export declare class DockingConnectorPeripheral implements IPeripheral {
    getType(): "docking_connector";
    getConnectedName(): string;
}

/** @noSelf */
export declare class LinkedTypewriterPeripheral implements IPeripheral {
    getType(): "linked_typewriter";
    getPressedKeyCodes(): number[];
}

/** @noSelf */
export declare class ModulatingLinkPeripheral implements IPeripheral {
    getType(): "modulating_link";
    getClosestDistance(): number;
}

/** @noSelf */
export declare class NamePlatePeripheral implements IPeripheral {
    getType(): "name_plate";
    setName(newName: string): void;
    getName(): string;
}

/** @noSelf */
export declare class NavTablePeripheral implements IPeripheral {
    getType(): "navigation_table";
    getRelativeAngle(): number;
    getRelativeAngleRad(): number;
}

/** @noSelf */
export declare class OpticalSensorPeripheral implements IPeripheral {
    getType(): "optical_sensor";
    hasHit(): boolean;
    getDistance(): number;
    getBlock(): string;
    getRange(): number;
    setRange(blocks: number): void;
}

/** @noSelf */
export declare class SwivelBearingPeripheral implements IPeripheral {
    getType(): "swivel_bearing";
    getTargetAngle(): number;
    getTargetAngleRad(): number;
}

/** @noSelf */
export declare class TorsionSpringPeripheral implements IPeripheral {
    getType(): "torsion_spring";
    setLimit(limit: number): void;
    getAngle(): number;
    getAngleRad(): number;
    getLimit(): number;
    isRunning(): boolean;
}

declare module "@cc-ts/helpers/core/types" {
    interface Peripherals {
        altitude_sensor: AltitudeSensorPeripheral;
        gimbal_sensor: GimbalSensorPeripheral;
        navigation_table: NavTablePeripheral;
        linked_typewriter: LinkedTypewriterPeripheral;
        optical_sensor: OpticalSensorPeripheral;
        swivel_bearing: SwivelBearingPeripheral;

        velocity_sensor: VelocitySensorPeripheral;

        directional_link: DirectionalLinkPeripheral;
        modulating_link: ModulatingLinkPeripheral;

        docking_connector: DockingConnectorPeripheral;
        torsion_spring: TorsionSpringPeripheral;
        name_plate: NamePlatePeripheral;
    }
}

export {};
