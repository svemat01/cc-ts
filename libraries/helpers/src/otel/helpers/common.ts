/**
 * 🛠️ OpenTelemetry Common Helper Functions
 *
 * Essential utility functions for working with OpenTelemetry data structures.
 * These helpers make it easy to create, convert, and manipulate telemetry data
 * while maintaining type safety and following OpenTelemetry conventions.
 *
 * @module otel/helpers/common
 */

// Helper functions for OpenTelemetry common types

import {
  AnyValue,
  KeyValue,
  InstrumentationScope,
  Resource,
} from "../types/common";

/**
 * 🔧 Unique type that is not assignable to anything else.
 *
 * This special type represents empty JSON arrays in a way that's compatible
 * with ComputerCraft's textutils.empty_json_array while maintaining type safety.
 */
export type EmptyJsonArray = typeof textutils.empty_json_array & {
  _: Symbol;
};

/**
 * 📋 Constant representing an empty JSON array.
 *
 * Use this when you need to represent an empty array in OpenTelemetry data
 * structures that should serialize to `[]` in JSON.
 *
 * @example
 * ```typescript
 * const metric: Metric = {
 *   name: "test_metric",
 *   description: "A test metric",
 *   unit: "count",
 *   metadata: emptyJsonArray,  // Will serialize as []
 *   gauge: {
 *     dataPoints: [
 *       {
 *         // ...
 *         exemplars: emptyJsonArray  // Will serialize as []
 *       }
 *     ]
 *   }
 * };
 * ```
 */
export const emptyJsonArray: EmptyJsonArray = textutils.empty_json_array as any;

/**
 * 🎯 Create an AnyValue from a JavaScript value.
 *
 * Automatically converts JavaScript values to the appropriate AnyValue type.
 * This is the primary way to convert regular values into OpenTelemetry-compatible
 * attribute values.
 *
 * @param value - The JavaScript value to convert
 * @returns An AnyValue representation of the input
 *
 * @example
 * ```typescript
 * // Primitive values
 * const stringVal = createAnyValue("hello world");
 * // Result: { stringValue: "hello world" }
 *
 * const numberVal = createAnyValue(42);
 * // Result: { intValue: 42 }
 *
 * const floatVal = createAnyValue(3.14159);
 * // Result: { doubleValue: 3.14159 }
 *
 * const boolVal = createAnyValue(true);
 * // Result: { boolValue: true }
 *
 * // Arrays
 * const arrayVal = createAnyValue(["item1", "item2", 42]);
 * // Result: { arrayValue: { values: [{ stringValue: "item1" }, { stringValue: "item2" }, { intValue: 42 }] } }
 *
 * // Objects
 * const objectVal = createAnyValue({ name: "turtle", level: 64 });
 * // Result: { kvlistValue: { values: [{ key: "name", value: { stringValue: "turtle" } }, { key: "level", value: { intValue: 64 } }] } }
 * ```
 */
export function createAnyValue(value: unknown): AnyValue {
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (typeof value === "boolean") {
    return { boolValue: value };
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { intValue: value };
    }
    return { doubleValue: value };
  }
  // if (value instanceof Uint8Array) {
  //   return { bytesValue: value };
  // }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(createAnyValue),
      },
    };
  }
  if (value && typeof value === "object") {
    return {
      kvlistValue: {
        values: Object.entries(value).map(([key, val]) => ({
          key,
          value: createAnyValue(val),
        })),
      },
    };
  }

  // Fallback to string representation
  return { stringValue: String(value) };
}

/**
 * 🔍 Extract a JavaScript value from an AnyValue.
 *
 * Converts OpenTelemetry AnyValue back to regular JavaScript values.
 * This is useful when you need to work with attribute values in their
 * original JavaScript form.
 *
 * @param anyValue - The AnyValue to extract from
 * @returns The extracted JavaScript value
 *
 * @example
 * ```typescript
 * // Extract primitive values
 * const stringVal = extractAnyValue({ stringValue: "hello" });
 * // Result: "hello"
 *
 * const numberVal = extractAnyValue({ intValue: 42 });
 * // Result: 42
 *
 * const boolVal = extractAnyValue({ boolValue: true });
 * // Result: true
 *
 * // Extract arrays
 * const arrayVal = extractAnyValue({
 *   arrayValue: {
 *     values: [
 *       { stringValue: "item1" },
 *       { intValue: 42 }
 *     ]
 *   }
 * });
 * // Result: ["item1", 42]
 *
 * // Extract objects
 * const objectVal = extractAnyValue({
 *   kvlistValue: {
 *     values: [
 *       { key: "name", value: { stringValue: "turtle" } },
 *       { key: "level", value: { intValue: 64 } }
 *     ]
 *   }
 * });
 * // Result: { name: "turtle", level: 64 }
 * ```
 */
export function extractAnyValue(anyValue: AnyValue): unknown {
  if ("stringValue" in anyValue) return anyValue.stringValue;
  if ("boolValue" in anyValue) return anyValue.boolValue;
  if ("intValue" in anyValue) return anyValue.intValue;
  if ("doubleValue" in anyValue) return anyValue.doubleValue;
  if ("bytesValue" in anyValue) return anyValue.bytesValue;
  if ("arrayValue" in anyValue) {
    return anyValue.arrayValue.values.map(extractAnyValue);
  }
  if ("kvlistValue" in anyValue) {
    const result: Record<string, unknown> = {};
    for (const kv of anyValue.kvlistValue.values) {
      result[kv.key] = extractAnyValue(kv.value);
    }
    return result;
  }
  return null;
}

/**
 * 🔑 Create a KeyValue pair from a key and value.
 *
 * Convenience function to create OpenTelemetry KeyValue pairs.
 * The value is automatically converted to an AnyValue.
 *
 * @param key - The attribute key
 * @param value - The attribute value (will be converted to AnyValue)
 * @returns A KeyValue pair
 *
 * @example
 * ```typescript
 * const serviceNameAttr = createKeyValue("service.name", "turtle-miner");
 * // Result: { key: "service.name", value: { stringValue: "turtle-miner" } }
 *
 * const levelAttr = createKeyValue("mining.level", 64);
 * // Result: { key: "mining.level", value: { intValue: 64 } }
 *
 * const activeAttr = createKeyValue("turtle.active", true);
 * // Result: { key: "turtle.active", value: { boolValue: true } }
 * ```
 */
export function createKeyValue(key: string, value: unknown): KeyValue {
  return {
    key,
    value: createAnyValue(value),
  };
}

/**
 * 🏷️ Create KeyValue pairs from an object.
 *
 * Converts a plain JavaScript object into an array of OpenTelemetry KeyValue pairs.
 * This is the most common way to create attributes for telemetry data.
 *
 * @param attributes - Object with string keys and any values
 * @returns Array of KeyValue pairs, or empty array marker if no attributes
 *
 * @example
 * ```typescript
 * const attrs = createAttributes({
 *   "service.name": "turtle-miner",
 *   "turtle.id": 42,
 *   "turtle.active": true,
 *   "location": {
 *     x: 100,
 *     y: 64,
 *     z: 200
 *   }
 * });
 *
 * // Result: [
 * //   { key: "service.name", value: { stringValue: "turtle-miner" } },
 * //   { key: "turtle.id", value: { intValue: 42 } },
 * //   { key: "turtle.active", value: { boolValue: true } },
 * //   { key: "location", value: { kvlistValue: { values: [...] } } }
 * // ]
 *
 * // Empty object returns empty array marker
 * const emptyAttrs = createAttributes({});
 * // Result: emptyJsonArray (serializes as [])
 * ```
 */
export function createAttributes(
  attributes: Record<string, unknown>
): KeyValue[] {
  const attrs = Object.entries(attributes);
  if (attrs.length === 0) {
    return textutils.empty_json_array as any;
  }
  return attrs.map(([key, value]) => createKeyValue(key, value));
}

/**
 * 🔍 Extract attributes as a plain object.
 *
 * Converts an array of OpenTelemetry KeyValue pairs back to a plain JavaScript object.
 * Useful when you need to work with attributes in their original form.
 *
 * @param keyValues - Array of KeyValue pairs
 * @returns Plain object with extracted values
 *
 * @example
 * ```typescript
 * const keyValues: KeyValue[] = [
 *   { key: "service.name", value: { stringValue: "turtle-miner" } },
 *   { key: "turtle.id", value: { intValue: 42 } },
 *   { key: "turtle.active", value: { boolValue: true } }
 * ];
 *
 * const extracted = extractAttributes(keyValues);
 * // Result: {
 * //   "service.name": "turtle-miner",
 * //   "turtle.id": 42,
 * //   "turtle.active": true
 * // }
 * ```
 */
export function extractAttributes(
  keyValues: KeyValue[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const kv of keyValues) {
    result[kv.key] = extractAnyValue(kv.value);
  }
  return result;
}

/**
 * 🔬 Create an InstrumentationScope.
 *
 * Creates an OpenTelemetry instrumentation scope with the given parameters.
 * This identifies the library or module that generated the telemetry data.
 *
 * @param name - Name of the instrumentation scope (e.g., library name)
 * @param version - Version of the instrumentation scope (defaults to empty string)
 * @param attributes - Additional attributes for the scope (defaults to empty object)
 * @returns A complete InstrumentationScope object
 *
 * @example
 * ```typescript
 * // Basic scope
 * const basicScope = createInstrumentationScope("turtle-mining-lib");
 * // Result: { name: "turtle-mining-lib", version: "", attributes: [], droppedAttributesCount: 0 }
 *
 * // Scope with version
 * const versionedScope = createInstrumentationScope("turtle-mining-lib", "2.1.0");
 *
 * // Scope with attributes
 * const detailedScope = createInstrumentationScope(
 *   "turtle-mining-lib",
 *   "2.1.0",
 *   {
 *     "library.type": "automation",
 *     "library.language": "typescript"
 *   }
 * );
 * ```
 */
export function createInstrumentationScope(
  name: string,
  version: string = "",
  attributes: Record<string, unknown> = {}
): InstrumentationScope {
  return {
    name,
    version,
    attributes: createAttributes(attributes),
    droppedAttributesCount: 0,
  };
}

/**
 * 🏷️ Create a Resource.
 *
 * Creates an OpenTelemetry resource with the given attributes.
 * Resources identify the entity producing telemetry data (service, host, process, etc.).
 *
 * @param attributes - Attributes describing the resource (defaults to empty object)
 * @returns A complete Resource object
 *
 * @example
 * ```typescript
 * // Basic resource
 * const basicResource = createResource();
 * // Result: { attributes: [], droppedAttributesCount: 0 }
 *
 * // Service resource
 * const serviceResource = createResource({
 *   "service.name": "turtle-fleet",
 *   "service.version": "1.0.0",
 *   "service.instance.id": "turtle-42"
 * });
 *
 * // Turtle resource with location
 * const turtleResource = createResource({
 *   "service.name": "turtle-miner",
 *   "turtle.id": 42,
 *   "turtle.type": "mining",
 *   "location.world": "overworld",
 *   "location.x": 100,
 *   "location.y": 64,
 *   "location.z": 200
 * });
 * ```
 */
export function createResource(
  attributes: Record<string, unknown> = {}
): Resource {
  return {
    attributes: createAttributes(attributes),
    droppedAttributesCount: 0,
  };
}

/**
 * ⏰ Type alias for nanosecond timestamps.
 *
 * OpenTelemetry uses nanosecond precision timestamps as strings.
 * This type helps ensure proper timestamp formatting.
 */
export type Nanos = `${number}000000`;

/**
 * 🕐 Get current time in nanoseconds since Unix epoch.
 *
 * Returns the current time as a nanosecond timestamp string,
 * which is the standard format for OpenTelemetry timestamps.
 *
 * @returns Current time in nanoseconds as a string
 *
 * @example
 * ```typescript
 * const now = getCurrentTimeNanos();
 * // Result: "1640995200000000000" (example timestamp)
 *
 * // Use in telemetry data
 * const logRecord: LogRecord = {
 *   timeUnixNano: getCurrentTimeNanos(),
 *   observedTimeUnixNano: getCurrentTimeNanos(),
 *   // ... other fields
 * };
 * ```
 */
export function getCurrentTimeNanos(): Nanos {
  return msToNanos(os.epoch("utc")); // Convert milliseconds to nanoseconds
}

/**
 * 🔄 Convert milliseconds to nanoseconds.
 *
 * Converts ComputerCraft's millisecond timestamps to OpenTelemetry's
 * nanosecond format by appending six zeros.
 *
 * @param ms - Timestamp in milliseconds
 * @returns Timestamp in nanoseconds as a string
 *
 * @example
 * ```typescript
 * const msTimestamp = os.epoch("utc");  // e.g., 1640995200000
 * const nsTimestamp = msToNanos(msTimestamp);
 * // Result: "1640995200000000000"
 *
 * // Use with custom timestamps
 * const customTime = msToNanos(1640995200000);
 * // Result: "1640995200000000000"
 * ```
 */
export function msToNanos(ms: number): Nanos {
  return `${ms}000000`;
}

/**
 * 🔄 Convert nanoseconds to milliseconds.
 *
 * Converts OpenTelemetry's nanosecond timestamps back to milliseconds
 * by removing the last six digits.
 *
 * @param nanos - Timestamp in nanoseconds as a string
 * @returns Timestamp in milliseconds as a number
 *
 * @example
 * ```typescript
 * const nsTimestamp: Nanos = "1640995200000000000";
 * const msTimestamp = nanosToMs(nsTimestamp);
 * // Result: 1640995200000
 *
 * // Use for time calculations
 * const logTime = nanosToMs(logRecord.timeUnixNano);
 * const currentTime = os.epoch("utc");
 * const ageMs = currentTime - logTime;
 * ```
 */
export function nanosToMs(nanos: Nanos): number {
  // remove the last 6 zeros
  return Number(nanos.slice(0, -6));
}
