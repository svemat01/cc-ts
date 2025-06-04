/**
 * 🔧 OpenTelemetry Common Types
 *
 * Core type definitions that form the foundation of OpenTelemetry data structures.
 * These types are based on the official OpenTelemetry Protocol (OTLP) specification
 * and provide type-safe representations of telemetry data.
 *
 * @module otel/types/common
 */

// OpenTelemetry Common Types
// Based on opentelemetry/proto/common/v1/common.proto

/**
 * 🎯 AnyValue is used to represent any type of attribute value.
 *
 * This is a discriminated union that can contain primitives, arrays, or nested objects.
 * It's the foundation for all attribute values in OpenTelemetry, providing type safety
 * while allowing flexible data structures.
 *
 * @example
 * ```typescript
 * // String value
 * const stringValue: AnyValue = { stringValue: "hello world" };
 *
 * // Number values
 * const intValue: AnyValue = { intValue: 42 };
 * const doubleValue: AnyValue = { doubleValue: 3.14159 };
 *
 * // Boolean value
 * const boolValue: AnyValue = { boolValue: true };
 *
 * // Array value
 * const arrayValue: AnyValue = {
 *   arrayValue: {
 *     values: [
 *       { stringValue: "item1" },
 *       { stringValue: "item2" }
 *     ]
 *   }
 * };
 *
 * // Object value
 * const objectValue: AnyValue = {
 *   kvlistValue: {
 *     values: [
 *       { key: "name", value: { stringValue: "turtle" } },
 *       { key: "level", value: { intValue: 64 } }
 *     ]
 *   }
 * };
 * ```
 */
export type AnyValue =
  | { stringValue: string }
  | { boolValue: boolean }
  | { intValue: number }
  | { doubleValue: number }
  | { arrayValue: ArrayValue }
  | { kvlistValue: KeyValueList }
  | { bytesValue: Uint8Array };

/**
 * 📋 ArrayValue is a list of AnyValue messages.
 *
 * Used to represent arrays of mixed-type values in telemetry attributes.
 * Each element in the array can be any valid AnyValue type.
 *
 * @example
 * ```typescript
 * const mixedArray: ArrayValue = {
 *   values: [
 *     { stringValue: "minecraft:diamond_ore" },
 *     { intValue: 64 },
 *     { boolValue: true },
 *     { doubleValue: 12.5 }
 *   ]
 * };
 * ```
 */
export interface ArrayValue {
  /** Array of values of any supported type */
  values: AnyValue[];
}

/**
 * 🗂️ KeyValueList is a list of KeyValue messages.
 *
 * Used to represent object-like structures in telemetry attributes.
 * This allows for nested object representations while maintaining type safety.
 *
 * @example
 * ```typescript
 * const turtleInfo: KeyValueList = {
 *   values: [
 *     { key: "id", value: { intValue: 42 } },
 *     { key: "fuel", value: { intValue: 1000 } },
 *     { key: "position", value: {
 *       kvlistValue: {
 *         values: [
 *           { key: "x", value: { intValue: 100 } },
 *           { key: "y", value: { intValue: 64 } },
 *           { key: "z", value: { intValue: 200 } }
 *         ]
 *       }
 *     }}
 *   ]
 * };
 * ```
 */
export interface KeyValueList {
  /** Array of key-value pairs */
  values: KeyValue[];
}

/**
 * 🔑 KeyValue is a key-value pair used for attributes.
 *
 * The fundamental building block for all attribute data in OpenTelemetry.
 * Each key is a string, and the value can be any supported type via AnyValue.
 *
 * @example
 * ```typescript
 * // Simple string attribute
 * const serviceAttr: KeyValue = {
 *   key: "service.name",
 *   value: { stringValue: "turtle-miner" }
 * };
 *
 * // Numeric attribute
 * const levelAttr: KeyValue = {
 *   key: "mining.level",
 *   value: { intValue: 12 }
 * };
 *
 * // Boolean attribute
 * const activeAttr: KeyValue = {
 *   key: "turtle.active",
 *   value: { boolValue: true }
 * };
 * ```
 */
export interface KeyValue {
  /** The attribute key (must be a string) */
  key: string;
  /** The attribute value (can be any supported type) */
  value: AnyValue;
}

/**
 * 🔬 InstrumentationScope represents the instrumentation scope information.
 *
 * Identifies the library, framework, or instrumentation code that generated
 * the telemetry data. This helps with attribution and debugging.
 *
 * @example
 * ```typescript
 * const scope: InstrumentationScope = {
 *   name: "turtle-mining-lib",
 *   version: "2.1.0",
 *   attributes: [
 *     { key: "library.type", value: { stringValue: "automation" } },
 *     { key: "library.language", value: { stringValue: "typescript" } }
 *   ],
 *   droppedAttributesCount: 0
 * };
 * ```
 */
export interface InstrumentationScope {
  /** Name of the instrumentation scope (e.g., library name) */
  name: string;
  /** Version of the instrumentation scope */
  version: string;
  /** Additional attributes describing the scope */
  attributes: KeyValue[];
  /** Number of attributes that were dropped due to limits */
  droppedAttributesCount: number;
}

/**
 * 🏷️ Resource represents the entity producing telemetry data.
 *
 * Describes the source of telemetry data - typically a service, host, or process.
 * This is crucial for identifying and grouping telemetry data in monitoring systems.
 * Based on opentelemetry/proto/resource/v1/resource.proto
 *
 * @example
 * ```typescript
 * const turtleResource: Resource = {
 *   attributes: [
 *     { key: "service.name", value: { stringValue: "turtle-fleet" } },
 *     { key: "service.version", value: { stringValue: "1.0.0" } },
 *     { key: "turtle.id", value: { intValue: 42 } },
 *     { key: "turtle.type", value: { stringValue: "mining" } },
 *     { key: "location.world", value: { stringValue: "overworld" } },
 *     { key: "location.x", value: { intValue: 100 } },
 *     { key: "location.y", value: { intValue: 64 } },
 *     { key: "location.z", value: { intValue: 200 } }
 *   ],
 *   droppedAttributesCount: 0
 * };
 * ```
 */
export interface Resource {
  /** Attributes describing the resource */
  attributes: KeyValue[];
  /** Number of attributes that were dropped due to limits */
  droppedAttributesCount: number;
}

/**
 * 🔗 EntityRef represents a reference to an entity.
 *
 * Used for linking telemetry data to external entities or systems.
 * This is useful for correlating telemetry with external databases or systems.
 *
 * @example
 * ```typescript
 * const turtleEntityRef: EntityRef = {
 *   schemaUrl: "https://example.com/turtle-schema/v1",
 *   type: "turtle",
 *   idKeys: ["turtle.id", "turtle.owner"],
 *   descriptionKeys: ["turtle.name", "turtle.type"]
 * };
 * ```
 */
export interface EntityRef {
  /** URL to the schema defining this entity type */
  schemaUrl: string;
  /** Type of the entity being referenced */
  type: string;
  /** Keys that uniquely identify this entity */
  idKeys: string[];
  /** Keys that provide human-readable description */
  descriptionKeys: string[];
}
