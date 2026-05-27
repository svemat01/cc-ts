/** @noSelfInFile */
import "./advanced-math"

// ============================================
// CC: Sable - ComputerCraft Integration Types
// ============================================

// ============================================================================
// GLOBAL: aero
// ============================================================================

/** @noSelf */
declare global {
    namespace aero {
        /** Gets the air pressure at the given position */
        function getAirPressure(position: Vector): number;
    
        /** Gets the dimension's gravity vector */
        function getGravity(): Vector;
    
        /** Gets the dimension's magnetic north vector */
        function getMagneticNorth(): Vector;
    
        /** Gets the universal drag constant for the dimension */
        function getUniversalDrag(): number;
    
        /** Gets the raw physics information of the dimension */
        function getRaw(): {
            gravity?: Vector;
            basePressure?: number;
            magneticNorth?: Vector;
            universalDrag?: number;
            airPressureFunction?: unknown;
        };
    
        /** Gets the default physics information of the dimension */
        function getDefault(): {
            gravity?: Vector;
            basePressure?: number;
            magneticNorth?: Vector;
            universalDrag?: number;
            airPressureFunction?: unknown;
        };
    }
}

// ============================================================================
// GLOBAL: sublevel
// ============================================================================

/** @noSelf */
declare global {
    namespace sublevel {
        /** Pose information returned by sublevel APIs */
        interface SubLevelPose {
            position: Vector;
            orientation: quaternion;
            scale: Vector;
            rotationPoint: Vector;
        }

        /** Determines whether the computer is currently on a Sub-Level */
        function isInPlotGrid(): boolean;
    
        /** Gets the Sub-Level's Universally Unique Identifier (UUID) */
        function getUniqueId(): string;
    
        /** Gets the Sub-Level's name */
        function getName(): string;
    
        /** Sets the Sub-level's name */
        function setName(newName: string): void;
    
        /** Gets the Sub-Level's logical pose */
        function getLogicalPose(): SubLevelPose;
    
        /** Gets the Sub-Level's last pose */
        function getLastPose(): SubLevelPose;
    
        /** Gets the Sub-Level's global velocity */
        function getVelocity(): Vector;
    
        /** Gets the Sub-Level's latest linear velocity */
        function getLinearVelocity(): Vector;
    
        /** Gets the Sub-Level's latest angular velocity */
        function getAngularVelocity(): Vector;
    
        /** Gets the Sub-Level's center of mass */
        function getCenterOfMass(): Vector;
    
        /** Gets the Sub-Level's mass */
        function getMass(): number;
    
        /** Gets the Sub-Level's inverse mass */
        function getInverseMass(): number;
    
        /** Gets the Sub-Level's inertia tensor */
        function getInertiaTensor(): matrix;
    
        /** Gets the Sub-Level's inverse inertia tensor */
        function getInverseInertiaTensor(): matrix;
    }
}

export {};
