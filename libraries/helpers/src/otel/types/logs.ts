/**
 * 📝 OpenTelemetry Logs Types
 *
 * Type definitions for structured logging in OpenTelemetry. These types provide
 * a standardized way to represent log data with rich metadata, severity levels,
 * and contextual information. Perfect for building comprehensive logging systems
 * in your ComputerCraft applications!
 *
 * @module otel/types/logs
 */

// OpenTelemetry Logs Types
// Based on opentelemetry/proto/logs/v1/logs.proto

import { AnyValue, KeyValue, InstrumentationScope, Resource } from "./common";

/**
 * 📦 LogsData represents the logs data that can be stored or transferred.
 *
 * This is the top-level container for all log data in OpenTelemetry.
 * It groups logs by resource and instrumentation scope for efficient
 * organization and processing.
 *
 * @example
 * ```typescript
 * const logsData: LogsData = {
 *   resourceLogs: [
 *     {
 *       resource: {
 *         attributes: [
 *           { key: "service.name", value: { stringValue: "turtle-miner" } }
 *         ],
 *         droppedAttributesCount: 0
 *       },
 *       scopeLogs: [
 *         {
 *           scope: {
 *             name: "mining-operations",
 *             version: "1.0.0",
 *             attributes: [],
 *             droppedAttributesCount: 0
 *           },
 *           logRecords: [
 *             // ... log records
 *           ],
 *           schemaUrl: ""
 *         }
 *       ],
 *       schemaUrl: ""
 *     }
 *   ]
 * };
 * ```
 */
export interface LogsData {
  /** Array of resource logs, each containing logs from a specific resource */
  resourceLogs: ResourceLogs[];
}

/**
 * 🏷️ A collection of ScopeLogs from a Resource.
 *
 * Groups all logs from a specific resource (like a turtle, computer, or service).
 * This allows for efficient organization and attribution of log data.
 *
 * @example
 * ```typescript
 * const turtleResourceLogs: ResourceLogs = {
 *   resource: {
 *     attributes: [
 *       { key: "service.name", value: { stringValue: "turtle-42" } },
 *       { key: "turtle.type", value: { stringValue: "mining" } },
 *       { key: "location.x", value: { intValue: 100 } },
 *       { key: "location.y", value: { intValue: 64 } },
 *       { key: "location.z", value: { intValue: 200 } }
 *     ],
 *     droppedAttributesCount: 0
 *   },
 *   scopeLogs: [
 *     // Different scopes for different subsystems
 *     // e.g., mining-operations, navigation, inventory-management
 *   ],
 *   schemaUrl: "https://example.com/turtle-schema/v1"
 * };
 * ```
 */
export interface ResourceLogs {
  /** The resource that produced these logs */
  resource: Resource;
  /** Array of scope logs from this resource */
  scopeLogs: ScopeLogs[];
  /** URL to the schema defining the structure of this data */
  schemaUrl: string;
}

/**
 * 🔬 A collection of Logs produced by a Scope.
 *
 * Groups logs by instrumentation scope (like a specific library or module).
 * This helps organize logs by their source within a service.
 *
 * @example
 * ```typescript
 * const miningOperationsLogs: ScopeLogs = {
 *   scope: {
 *     name: "mining-operations",
 *     version: "2.1.0",
 *     attributes: [
 *       { key: "module.type", value: { stringValue: "core" } }
 *     ],
 *     droppedAttributesCount: 0
 *   },
 *   logRecords: [
 *     {
 *       timeUnixNano: "1640995200000000000",
 *       observedTimeUnixNano: "1640995200000000000",
 *       severityNumber: SeverityNumber.INFO,
 *       severityText: "INFO",
 *       body: { stringValue: "Started mining operation" },
 *       attributes: [
 *         { key: "target.depth", value: { intValue: 64 } },
 *         { key: "expected.duration", value: { stringValue: "30min" } }
 *       ],
 *       droppedAttributesCount: 0,
 *       flags: 0,
 *       eventName: "mining.started"
 *     }
 *   ],
 *   schemaUrl: ""
 * };
 * ```
 */
export interface ScopeLogs {
  /** The instrumentation scope that produced these logs */
  scope: InstrumentationScope;
  /** Array of log records from this scope */
  logRecords: LogRecord[];
  /** URL to the schema defining the structure of this data */
  schemaUrl: string;
}

/**
 * 🎯 Possible values for LogRecord.SeverityNumber.
 *
 * Standard severity levels following OpenTelemetry conventions.
 * Each level has multiple variants (e.g., DEBUG, DEBUG2, DEBUG3, DEBUG4)
 * to allow for fine-grained severity control.
 *
 * @example
 * ```typescript
 * // Basic usage
 * client.sendLog("Mining started", SeverityNumber.INFO);
 * client.sendLog("Low fuel warning", SeverityNumber.WARN);
 * client.sendLog("Mining failed", SeverityNumber.ERROR);
 *
 * // Fine-grained severity
 * client.sendLog("Detailed debug info", SeverityNumber.DEBUG2);
 * client.sendLog("Critical system failure", SeverityNumber.FATAL);
 *
 * // Conditional logging based on severity
 * function logWithSeverity(message: string, level: SeverityNumber) {
 *   if (level >= SeverityNumber.WARN) {
 *     // Also send to alert system
 *     sendAlert(message);
 *   }
 *   client.sendLog(message, level);
 * }
 * ```
 */
export enum SeverityNumber {
  /** Unspecified severity level */
  UNSPECIFIED = 0,
  /** Trace level 1 - finest granularity */
  TRACE = 1,
  /** Trace level 2 */
  TRACE2 = 2,
  /** Trace level 3 */
  TRACE3 = 3,
  /** Trace level 4 - coarsest trace */
  TRACE4 = 4,
  /** Debug level 1 - finest debug info */
  DEBUG = 5,
  /** Debug level 2 */
  DEBUG2 = 6,
  /** Debug level 3 */
  DEBUG3 = 7,
  /** Debug level 4 - coarsest debug */
  DEBUG4 = 8,
  /** Info level 1 - general information */
  INFO = 9,
  /** Info level 2 */
  INFO2 = 10,
  /** Info level 3 */
  INFO3 = 11,
  /** Info level 4 - important info */
  INFO4 = 12,
  /** Warning level 1 - potential issues */
  WARN = 13,
  /** Warning level 2 */
  WARN2 = 14,
  /** Warning level 3 */
  WARN3 = 15,
  /** Warning level 4 - serious warnings */
  WARN4 = 16,
  /** Error level 1 - error conditions */
  ERROR = 17,
  /** Error level 2 */
  ERROR2 = 18,
  /** Error level 3 */
  ERROR3 = 19,
  /** Error level 4 - serious errors */
  ERROR4 = 20,
  /** Fatal level 1 - system unusable */
  FATAL = 21,
  /** Fatal level 2 */
  FATAL2 = 22,
  /** Fatal level 3 */
  FATAL3 = 23,
  /** Fatal level 4 - complete system failure */
  FATAL4 = 24,
}

/**
 * 🚩 LogRecordFlags represents constants used to interpret the LogRecord.flags field.
 *
 * Bit flags that provide additional metadata about log records.
 * Currently includes trace correlation flags.
 *
 * @example
 * ```typescript
 * // Check if a log record has trace correlation
 * const hasTraceInfo = (logRecord.flags & LogRecordFlags.TRACE_FLAGS_MASK) !== 0;
 *
 * // Set trace flags (typically done automatically)
 * const flagsWithTrace = LogRecordFlags.TRACE_FLAGS_MASK | otherFlags;
 * ```
 */
export enum LogRecordFlags {
  /** Default value - do not use */
  DO_NOT_USE = 0,
  /** Mask for extracting trace-related flags */
  TRACE_FLAGS_MASK = 0x000000ff,
}

/**
 * 📋 A log record according to OpenTelemetry Log Data Model.
 *
 * Represents a single log entry with all its metadata, context, and content.
 * This is the core data structure for all logging in OpenTelemetry.
 *
 * @example
 * ```typescript
 * const miningLogRecord: LogRecord = {
 *   timeUnixNano: "1640995200000000000",
 *   observedTimeUnixNano: "1640995200000000000",
 *   severityNumber: SeverityNumber.INFO,
 *   severityText: "INFO",
 *   body: { stringValue: "Successfully mined diamond ore" },
 *   attributes: [
 *     { key: "block.type", value: { stringValue: "minecraft:diamond_ore" } },
 *     { key: "block.position", value: {
 *       kvlistValue: {
 *         values: [
 *           { key: "x", value: { intValue: 100 } },
 *           { key: "y", value: { intValue: 12 } },
 *           { key: "z", value: { intValue: 200 } }
 *         ]
 *       }
 *     }},
 *     { key: "tool.durability", value: { intValue: 1450 } },
 *     { key: "mining.duration_ms", value: { intValue: 250 } }
 *   ],
 *   droppedAttributesCount: 0,
 *   flags: 0,
 *   eventName: "block.mined"
 * };
 * ```
 */
export interface LogRecord {
  /** Timestamp when the event occurred (nanoseconds since Unix epoch) */
  timeUnixNano: string;
  /** Timestamp when the event was observed (nanoseconds since Unix epoch) */
  observedTimeUnixNano: string;
  /** Numeric severity level */
  severityNumber: SeverityNumber;
  /** Human-readable severity level */
  severityText: string;
  /** The main log content (message, structured data, etc.) */
  body: AnyValue;
  /** Additional context attributes */
  attributes: KeyValue[];
  /** Number of attributes that were dropped due to limits */
  droppedAttributesCount: number;
  /** Bit field for additional flags */
  flags: number;
  /** Optional event name for categorization */
  eventName: string;
}
