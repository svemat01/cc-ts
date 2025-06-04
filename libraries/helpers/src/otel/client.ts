/**
 * 🚀 OpenTelemetry Rednet Client for ComputerCraft
 *
 * The ultimate telemetry toolkit for your ComputerCraft adventures! This module provides a lightweight,
 * fire-and-forget OpenTelemetry client that sends metrics and logs over Rednet to a central collector.
 * Perfect for monitoring your turtle fleets, tracking mining operations, or debugging complex automation systems! 🐢✨
 *
 * ## 🌟 Key Features
 * - 📊 **Real-time Metrics**: Counters, gauges, and histograms for all your measurement needs
 * - 📝 **Structured Logging**: From debug traces to fatal errors, with rich attributes
 * - 🌐 **Rednet Integration**: Native ComputerCraft networking - no HTTP required!
 * - 🎯 **Fire-and-Forget**: No local batching, just instant transmission to your collector
 * - 🏷️ **Rich Metadata**: Resource attributes, scopes, and custom tags for everything
 * - 🔧 **Instrument-Style API**: Familiar OpenTelemetry patterns adapted for Lua/TypeScript
 *
 * ## 🎮 Perfect For
 * - **Turtle Fleet Management**: Track mining progress, fuel levels, and inventory across hundreds of turtles
 * - **Factory Monitoring**: Monitor production rates, resource flows, and machine health
 * - **Base Automation**: Track power generation, storage levels, and system performance
 * - **Debugging Complex Systems**: Rich logging with context to troubleshoot distributed automation
 * - **Performance Analysis**: Histogram metrics for operation timing and resource usage
 * - **Alert Systems**: Send critical logs and metrics for real-time monitoring
 *
 * ## 🚨 Important Notes
 * - **Rednet Required**: Make sure you have a modem attached and `rednet.open()` called
 * - **Collector Dependency**: You need a {@link RednetCollector} running somewhere to receive data
 * - **Network Overhead**: Each metric/log is sent immediately - consider your network capacity
 * - **No Persistence**: Data is fire-and-forget - if the collector is down, data is lost
 *
 * @example Basic Client Setup
 * ```typescript
 * import { RednetClient } from "@cc-ts/helpers/otel";
 *
 * // Set up your client (collector ID 42 in this example)
 * const client = new RednetClient(
 *   42,                    // Collector computer ID
 *   "turtle-miner-001",    // Service name
 *   "2.1.0",              // Service version
 *   {                     // Resource attributes
 *     "turtle.type": "mining",
 *     "location.x": 100,
 *     "location.y": 64,
 *     "location.z": 200
 *   }
 * );
 *
 * // Send some metrics
 * client.sendCounter("blocks_mined", "Blocks mined by turtle", "blocks", 1, {
 *   "block.type": "minecraft:diamond_ore"
 * });
 *
 * client.sendGauge("fuel_level", "Current fuel level", "units", turtle.getFuelLevel());
 *
 * // Send logs with context
 * client.info("Started mining operation", {
 *   "target.depth": 12,
 *   "expected.duration": "30min"
 * });
 * ```
 *
 * @example Instrument-Style API
 * ```typescript
 * import { RednetClient, RednetInstrumentClient } from "@cc-ts/helpers/otel";
 *
 * const client = new RednetClient(42, "factory-controller");
 * const instruments = new RednetInstrumentClient(client);
 *
 * // Create instruments once, use many times
 * const itemsProduced = instruments.createCounter(
 *   "items_produced_total",
 *   "Total items produced by factory",
 *   "items"
 * );
 *
 * const powerLevel = instruments.createGauge(
 *   "power_level",
 *   "Current power level in RF",
 *   "RF"
 * );
 *
 * // Use them in your production loop
 * while (factoryRunning) {
 *   const produced = produceItems();
 *   itemsProduced.add(produced, { "item.type": "iron_ingot" });
 *
 *   const currentPower = getPowerLevel();
 *   powerLevel.set(currentPower);
 *
 *   if (currentPower < 1000) {
 *     client.warn("Low power warning", { "power.level": currentPower });
 *   }
 * }
 * ```
 *
 * @example Advanced Histogram Tracking
 * ```typescript
 * // Track operation timing with histograms
 * const client = new RednetClient(42, "advanced-turtle");
 *
 * async function timedMining() {
 *   const startTime = os.epoch("utc");
 *
 *   // Do the mining work
 *   const success = turtle.dig();
 *
 *   const duration = os.epoch("utc") - startTime;
 *
 *   // Send histogram data
 *   client.sendHistogram(
 *     "mining_duration",
 *     "Time taken to mine a block",
 *     "ms",
 *     1,                    // count
 *     duration,             // sum
 *     [                    // bucket data
 *       { bound: 100, count: duration <= 100 ? 1 : 0 },
 *       { bound: 500, count: duration <= 500 ? 1 : 0 },
 *       { bound: 1000, count: duration <= 1000 ? 1 : 0 },
 *       { bound: 5000, count: 1 }  // +Inf bucket
 *     ],
 *     { "success": success, "tool.type": "diamond_pickaxe" }
 *   );
 * }
 * ```
 *
 * @example Multi-Service Architecture
 * ```typescript
 * // Different services for different roles
 * const miningClient = new RednetClient(42, "mining-service", "1.0.0", {
 *   "service.role": "mining",
 *   "turtle.id": os.getComputerID()
 * });
 *
 * const logisticsClient = new RednetClient(42, "logistics-service", "1.0.0", {
 *   "service.role": "logistics",
 *   "base.location": "main"
 * });
 *
 * // Each service sends relevant metrics
 * miningClient.sendCounter("ore_found", "Ore blocks found", "blocks", 1);
 * logisticsClient.sendGauge("storage_utilization", "Storage usage", "percent", 85);
 * ```
 *
 * @module otel/client
 */

// Rednet client for sending individual metrics and logs to central collector
// No local batching - just fire and forget to the collector

import { SeverityNumber } from "./types/logs";

/**
 * 📊 Simple metric data structure for transmission over Rednet.
 *
 * This is the wire format for sending metrics from clients to collectors.
 * Each metric includes all the context needed for proper aggregation and storage.
 *
 * @example
 * ```typescript
 * const metric: RednetMetric = {
 *   type: "counter",
 *   name: "http_requests_total",
 *   description: "Total HTTP requests processed",
 *   unit: "requests",
 *   value: 42,
 *   attributes: { "method": "GET", "status": "200" },
 *   timestamp: os.epoch("utc"),
 *   resource: { "service.name": "web-server" },
 *   scope: { name: "web-server", version: "1.0.0" }
 * };
 * ```
 */
export interface RednetMetric {
  /** The type of metric - determines how it's aggregated */
  type: "counter" | "gauge" | "histogram";
  /** Unique name for this metric */
  name: string;
  /** Human-readable description of what this metric measures */
  description: string;
  /** Unit of measurement (e.g., "bytes", "seconds", "requests") */
  unit: string;
  /** The metric value - number for counter/gauge, histogram data for histogram */
  value:
    | number
    | {
        /** Number of observations in the histogram */
        count: number;
        /** Sum of all observed values */
        sum: number;
        /** Bucket counts for histogram distribution */
        buckets: { bound: number; count: number }[];
      };
  /** Key-value attributes for this specific measurement */
  attributes: Record<string, unknown>;
  /** Timestamp in nanoseconds since Unix epoch */
  timestamp: number;
  /** Resource attributes identifying the source */
  resource: Record<string, unknown>;
  /** Instrumentation scope information */
  scope: {
    /** Name of the instrumentation scope */
    name: string;
    /** Version of the instrumentation scope */
    version: string;
  };
}

/**
 * 📝 Simple log data structure for transmission over Rednet.
 *
 * This is the wire format for sending log records from clients to collectors.
 * Each log includes severity, context, and rich metadata for analysis.
 *
 * @example
 * ```typescript
 * const log: RednetLog = {
 *   body: "User login successful",
 *   severity: SeverityNumber.INFO,
 *   attributes: { "user.id": "123", "login.method": "password" },
 *   timestamp: os.epoch("utc"),
 *   resource: { "service.name": "auth-service" },
 *   scope: { name: "auth-service", version: "2.0.0" }
 * };
 * ```
 */
export interface RednetLog {
  /** The main log message or structured data */
  body: string;
  /** Severity level using OpenTelemetry standard numbers */
  severity: SeverityNumber;
  /** Key-value attributes providing context */
  attributes: Record<string, unknown>;
  /** Timestamp in nanoseconds since Unix epoch */
  timestamp: number;
  /** Resource attributes identifying the source */
  resource: Record<string, unknown>;
  /** Instrumentation scope information */
  scope: {
    /** Name of the instrumentation scope */
    name: string;
    /** Version of the instrumentation scope */
    version: string;
  };
}

/**
 * 📦 Union type for all telemetry data that can be sent over Rednet.
 *
 * This discriminated union allows the collector to properly handle
 * different types of telemetry data in a type-safe manner.
 */
export type RednetTelemetry =
  | ({ telemetryType: "metric" } & RednetMetric)
  | ({ telemetryType: "log" } & RednetLog);

/**
 * 🔍 Type guard to check if a message is valid telemetry data.
 *
 * Use this to safely validate incoming Rednet messages before processing.
 *
 * @param message - The message to check
 * @returns True if the message is valid telemetry data
 *
 * @example
 * ```typescript
 * rednet.receive("otel_telemetry", (senderId, message) => {
 *   if (isRednetTelemetry(message)) {
 *     // Safe to process as telemetry
 *     collector.processTelemetry(message);
 *   } else {
 *     print("Invalid telemetry data received");
 *   }
 * });
 * ```
 */
export function isRednetTelemetry(
  message: unknown
): message is RednetTelemetry {
  return (
    typeof message === "object" &&
    message !== null &&
    "telemetryType" in message
  );
}

/**
 * 🚀 Simple Rednet client - sends metrics and logs immediately to collector.
 *
 * This is your main interface for sending telemetry data! The client handles
 * all the formatting, metadata, and transmission details so you can focus on
 * what matters - getting insights from your ComputerCraft systems.
 *
 * The client is designed to be lightweight and fire-and-forget. Each metric
 * and log is sent immediately over Rednet with no local buffering or batching.
 * This makes it perfect for real-time monitoring but means you need a reliable
 * network connection to your collector.
 *
 * @example Basic Usage
 * ```typescript
 * const client = new RednetClient(
 *   42,                    // Collector computer ID
 *   "my-awesome-turtle",   // Service name
 *   "1.0.0",              // Service version
 *   {                     // Resource attributes
 *     "turtle.role": "miner",
 *     "location": "diamond_mine_1"
 *   }
 * );
 *
 * // Send metrics
 * client.sendCounter("blocks_mined", "Total blocks mined", "blocks", 1);
 * client.sendGauge("fuel_level", "Current fuel", "units", turtle.getFuelLevel());
 *
 * // Send logs
 * client.info("Mining started", { "target.depth": 64 });
 * client.error("Low fuel warning", { "fuel.remaining": 10 });
 * ```
 */
export class RednetClient {
  private collectorId: number;
  private protocol: string;
  private resource: Record<string, unknown>;
  private scope: { name: string; version: string };

  /**
   * Create a new Rednet telemetry client.
   *
   * @param collectorId - Computer ID of the collector to send data to
   * @param serviceName - Name of your service (e.g., "turtle-miner", "factory-controller")
   * @param serviceVersion - Version of your service (defaults to "1.0.0")
   * @param resourceAttributes - Additional resource attributes to include with all telemetry
   * @param protocol - Rednet protocol to use (defaults to "otel_telemetry")
   *
   * @example
   * ```typescript
   * const client = new RednetClient(
   *   42,                           // Send to computer ID 42
   *   "quarry-turtle-001",         // Service name
   *   "2.1.0",                     // Service version
   *   {                            // Resource attributes
   *     "turtle.type": "quarry",
   *     "location.x": 100,
   *     "location.z": 200,
   *     "owner": "steve"
   *   },
   *   "my_custom_protocol"         // Custom protocol
   * );
   * ```
   */
  constructor(
    collectorId: number,
    serviceName: string,
    serviceVersion: string = "1.0.0",
    resourceAttributes: Record<string, unknown> = {},
    protocol: string = "otel_telemetry"
  ) {
    this.collectorId = collectorId;
    this.protocol = protocol;
    this.resource = {
      "service.name": serviceName,
      "service.version": serviceVersion,
      ...resourceAttributes,
    };
    this.scope = {
      name: serviceName,
      version: serviceVersion,
    };
  }

  /**
   * 📈 Send a counter metric immediately.
   *
   * Counters track cumulative values that only increase (like total requests,
   * blocks mined, or items produced). Perfect for tracking totals over time!
   *
   * @param name - Metric name (e.g., "http_requests_total", "blocks_mined")
   * @param description - Human-readable description
   * @param unit - Unit of measurement (e.g., "requests", "blocks", "bytes")
   * @param value - The counter value (must be positive)
   * @param attributes - Additional attributes for this measurement
   *
   * @example
   * ```typescript
   * // Track mining progress
   * client.sendCounter("blocks_mined_total", "Total blocks mined", "blocks", 1, {
   *   "block.type": "minecraft:diamond_ore",
   *   "tool.type": "diamond_pickaxe",
   *   "depth": 12
   * });
   *
   * // Track item production
   * client.sendCounter("items_crafted", "Items crafted", "items", 64, {
   *   "item.type": "minecraft:iron_ingot",
   *   "recipe.type": "smelting"
   * });
   * ```
   */
  sendCounter(
    name: string,
    description: string,
    unit: string,
    value: number,
    attributes: Record<string, unknown> = {}
  ): void {
    const telemetry: RednetTelemetry = {
      telemetryType: "metric",
      type: "counter",
      name,
      description,
      unit,
      value,
      attributes,
      timestamp: os.epoch("utc"),
      resource: this.resource,
      scope: this.scope,
    };

    this.sendTelemetry(telemetry);
  }

  /**
   * 📊 Send a gauge metric immediately.
   *
   * Gauges track current values that can go up or down (like fuel level,
   * temperature, or queue size). Perfect for monitoring current state!
   *
   * @param name - Metric name (e.g., "fuel_level", "temperature", "queue_size")
   * @param description - Human-readable description
   * @param unit - Unit of measurement (e.g., "units", "celsius", "items")
   * @param value - The current gauge value
   * @param attributes - Additional attributes for this measurement
   *
   * @example
   * ```typescript
   * // Monitor turtle fuel
   * client.sendGauge("fuel_level", "Current fuel level", "units",
   *   turtle.getFuelLevel(), {
   *     "fuel.type": "minecraft:coal",
   *     "max.fuel": 80000
   *   }
   * );
   *
   * // Monitor storage utilization
   * client.sendGauge("storage_utilization", "Storage space used", "percent",
   *   (usedSlots / totalSlots) * 100, {
   *     "storage.type": "chest",
   *     "location": "main_base"
   *   }
   * );
   * ```
   */
  sendGauge(
    name: string,
    description: string,
    unit: string,
    value: number,
    attributes: Record<string, unknown> = {}
  ): void {
    const telemetry: RednetTelemetry = {
      telemetryType: "metric",
      type: "gauge",
      name,
      description,
      unit,
      value,
      attributes,
      timestamp: os.epoch("utc"),
      resource: this.resource,
      scope: this.scope,
    };

    this.sendTelemetry(telemetry);
  }

  /**
   * 📈 Send a histogram metric immediately.
   *
   * Histograms track distributions of values (like request duration, file sizes,
   * or operation timing). Perfect for understanding performance characteristics!
   *
   * @param name - Metric name (e.g., "request_duration", "file_size")
   * @param description - Human-readable description
   * @param unit - Unit of measurement (e.g., "seconds", "bytes", "ms")
   * @param count - Number of observations
   * @param sum - Sum of all observed values
   * @param buckets - Bucket counts for the histogram distribution
   * @param attributes - Additional attributes for this measurement
   *
   * @example
   * ```typescript
   * // Track mining operation timing
   * const startTime = os.epoch("utc");
   * const success = turtle.dig();
   * const duration = os.epoch("utc") - startTime;
   *
   * client.sendHistogram(
   *   "mining_duration",
   *   "Time to mine a block",
   *   "ms",
   *   1,        // count
   *   duration, // sum
   *   [         // buckets (cumulative counts)
   *     { bound: 100, count: duration <= 100 ? 1 : 0 },
   *     { bound: 500, count: duration <= 500 ? 1 : 0 },
   *     { bound: 1000, count: duration <= 1000 ? 1 : 0 },
   *     { bound: Infinity, count: 1 }
   *   ],
   *   { "success": success, "block.hardness": "medium" }
   * );
   * ```
   */
  sendHistogram(
    name: string,
    description: string,
    unit: string,
    count: number,
    sum: number,
    buckets: { bound: number; count: number }[],
    attributes: Record<string, unknown> = {}
  ): void {
    const telemetry: RednetTelemetry = {
      telemetryType: "metric",
      type: "histogram",
      name,
      description,
      unit,
      value: { count, sum, buckets },
      attributes,
      timestamp: os.epoch("utc"),
      resource: this.resource,
      scope: this.scope,
    };

    this.sendTelemetry(telemetry);
  }

  /**
   * 📝 Send a log immediately.
   *
   * Send a structured log record with the specified severity level.
   * Use the convenience methods (debug, info, warn, error, fatal) for common cases.
   *
   * @param body - The log message or structured data
   * @param severity - Severity level using OpenTelemetry standard
   * @param attributes - Additional context attributes
   *
   * @example
   * ```typescript
   * client.sendLog("Mining operation completed", SeverityNumber.INFO, {
   *   "blocks.mined": 64,
   *   "duration.seconds": 120,
   *   "fuel.consumed": 32
   * });
   * ```
   */
  sendLog(
    body: string,
    severity: SeverityNumber,
    attributes: Record<string, unknown> = {}
  ): void {
    const telemetry: RednetTelemetry = {
      telemetryType: "log",
      body,
      severity,
      attributes,
      timestamp: os.epoch("utc"),
      resource: this.resource,
      scope: this.scope,
    };

    this.sendTelemetry(telemetry);
  }

  /**
   * 🐛 Send debug log.
   *
   * Use for detailed diagnostic information, typically only of interest
   * when diagnosing problems.
   *
   * @param message - Debug message
   * @param attributes - Additional context
   *
   * @example
   * ```typescript
   * client.debug("Checking inventory slot", {
   *   "slot": 3,
   *   "expected.item": "minecraft:coal"
   * });
   * ```
   */
  debug(message: string, attributes: Record<string, unknown> = {}): void {
    this.sendLog(message, SeverityNumber.DEBUG, attributes);
  }

  /**
   * ℹ️ Send info log.
   *
   * Use for general information about system operation.
   *
   * @param message - Info message
   * @param attributes - Additional context
   *
   * @example
   * ```typescript
   * client.info("Mining operation started", {
   *   "target.depth": 64,
   *   "estimated.duration": "30min"
   * });
   * ```
   */
  info(message: string, attributes: Record<string, unknown> = {}): void {
    this.sendLog(message, SeverityNumber.INFO, attributes);
  }

  /**
   * ⚠️ Send warn log.
   *
   * Use for potentially harmful situations that don't prevent operation.
   *
   * @param message - Warning message
   * @param attributes - Additional context
   *
   * @example
   * ```typescript
   * client.warn("Low fuel warning", {
   *   "fuel.remaining": 100,
   *   "fuel.threshold": 500
   * });
   * ```
   */
  warn(message: string, attributes: Record<string, unknown> = {}): void {
    this.sendLog(message, SeverityNumber.WARN, attributes);
  }

  /**
   * ❌ Send error log.
   *
   * Use for error events that might still allow the application to continue.
   *
   * @param message - Error message
   * @param attributes - Additional context
   *
   * @example
   * ```typescript
   * client.error("Failed to mine block", {
   *   "block.position": { x: 10, y: 64, z: 20 },
   *   "error.reason": "bedrock_encountered"
   * });
   * ```
   */
  error(message: string, attributes: Record<string, unknown> = {}): void {
    this.sendLog(message, SeverityNumber.ERROR, attributes);
  }

  /**
   * 💀 Send fatal log.
   *
   * Use for very severe error events that will likely lead to application abort.
   *
   * @param message - Fatal error message
   * @param attributes - Additional context
   *
   * @example
   * ```typescript
   * client.fatal("Critical system failure", {
   *   "error.type": "out_of_memory",
   *   "system.state": "corrupted"
   * });
   * ```
   */
  fatal(message: string, attributes: Record<string, unknown> = {}): void {
    this.sendLog(message, SeverityNumber.FATAL, attributes);
  }

  /**
   * 📡 Send the telemetry over Rednet.
   *
   * This handles the actual network transmission. In ComputerCraft, this uses
   * the rednet.send() function to transmit data to the collector.
   *
   * @param telemetry - The telemetry data to send
   * @private
   */
  private sendTelemetry(telemetry: RednetTelemetry): void {
    // In ComputerCraft, this would be:
    rednet.send(this.collectorId, telemetry, this.protocol);
    // For now, we'll just log it (in actual implementation, remove this)
    // console.log(`Sending to ${this.collectorId}:`, telemetry);
  }

  /**
   * 🔄 Update resource attributes (e.g., when turtle moves location).
   *
   * Use this to update resource attributes dynamically, such as when a turtle
   * moves to a new location or changes its operational state.
   *
   * @param newAttributes - New attributes to merge with existing ones
   *
   * @example
   * ```typescript
   * // Update turtle location after movement
   * const pos = turtle.getPosition();
   * client.updateResource({
   *   "location.x": pos.x,
   *   "location.y": pos.y,
   *   "location.z": pos.z,
   *   "last.update": os.epoch("utc")
   * });
   * ```
   */
  updateResource(newAttributes: Record<string, unknown>): void {
    this.resource = {
      ...this.resource,
      ...newAttributes,
    };
  }
}

/**
 * 🎛️ Instrument-style client that sends metrics immediately.
 *
 * This provides a more traditional OpenTelemetry experience where you create
 * instrument objects once and then use them multiple times. It's built on top
 * of the RednetClient but provides a more convenient API for repeated measurements.
 *
 * Perfect when you want to create instruments once at startup and then use them
 * throughout your application lifecycle without repeating metric metadata.
 *
 * @example
 * ```typescript
 * const client = new RednetClient(42, "my-service");
 * const instruments = new RednetInstrumentClient(client);
 *
 * // Create instruments once
 * const requestsTotal = instruments.createCounter(
 *   "requests_total",
 *   "Total HTTP requests",
 *   "requests"
 * );
 * const activeConnections = instruments.createGauge(
 *   "active_connections",
 *   "Currently active connections",
 *   "connections"
 * );
 *
 * // Use them many times
 * requestsTotal.add(1, { "method": "GET" });
 * activeConnections.set(42);
 * ```
 */
export class RednetInstrumentClient {
  private client: RednetClient;
  private instruments: Map<
    string,
    { type: string; name: string; description: string; unit: string }
  > = new Map();

  /**
   * Create a new instrument client.
   *
   * @param client - The underlying RednetClient to use for transmission
   */
  constructor(client: RednetClient) {
    this.client = client;
  }

  /**
   * 📈 Create a counter instrument.
   *
   * Returns a counter that you can use to track cumulative values.
   * The counter remembers its metadata so you don't have to repeat it.
   *
   * @param name - Counter name
   * @param description - Human-readable description (optional)
   * @param unit - Unit of measurement (optional)
   * @returns A counter instrument
   *
   * @example
   * ```typescript
   * const blocksMinedCounter = instruments.createCounter(
   *   "blocks_mined_total",
   *   "Total blocks mined by this turtle",
   *   "blocks"
   * );
   *
   * // Use it in your mining loop
   * while (mining) {
   *   if (turtle.dig()) {
   *     blocksMinedCounter.add(1, { "block.type": getBlockType() });
   *   }
   * }
   * ```
   */
  createCounter(
    name: string,
    description: string = "",
    unit: string = ""
  ): RednetCounter {
    this.instruments.set(name, { type: "counter", name, description, unit });
    return new RednetCounter(this.client, name, description, unit);
  }

  /**
   * 📊 Create a gauge instrument.
   *
   * Returns a gauge that you can use to track current values.
   * The gauge remembers its metadata so you don't have to repeat it.
   *
   * @param name - Gauge name
   * @param description - Human-readable description (optional)
   * @param unit - Unit of measurement (optional)
   * @returns A gauge instrument
   *
   * @example
   * ```typescript
   * const fuelGauge = instruments.createGauge(
   *   "fuel_level",
   *   "Current turtle fuel level",
   *   "units"
   * );
   *
   * // Update it periodically
   * setInterval(() => {
   *   fuelGauge.set(turtle.getFuelLevel());
   * }, 5000);
   * ```
   */
  createGauge(
    name: string,
    description: string = "",
    unit: string = ""
  ): RednetGauge {
    this.instruments.set(name, { type: "gauge", name, description, unit });
    return new RednetGauge(this.client, name, description, unit);
  }
}

/**
 * 📈 A counter instrument that tracks cumulative values.
 *
 * Counters are perfect for tracking things that only increase over time,
 * like total requests processed, blocks mined, or items crafted.
 *
 * The counter maintains its current value and sends updates to the collector
 * whenever you add to it. It also remembers all the metric metadata so you
 * don't have to repeat it with each measurement.
 *
 * @example
 * ```typescript
 * const counter = new RednetCounter(client, "items_processed", "Items processed", "items");
 *
 * // Add values as work is done
 * counter.add(1);                    // Simple increment
 * counter.add(5, { "type": "ore" }); // Batch with attributes
 *
 * console.log(`Total processed: ${counter.getValue()}`);
 * ```
 */
export class RednetCounter {
  private client: RednetClient;
  private name: string;
  private description: string;
  private unit: string;
  private value: number = 0;

  /**
   * Create a new counter instrument.
   *
   * @param client - RednetClient for sending data
   * @param name - Counter name
   * @param description - Human-readable description
   * @param unit - Unit of measurement
   */
  constructor(
    client: RednetClient,
    name: string,
    description: string,
    unit: string
  ) {
    this.client = client;
    this.name = name;
    this.description = description;
    this.unit = unit;
  }

  /**
   * 📈 Add a value to the counter.
   *
   * The value is added to the current total and immediately sent to the collector.
   * Counter values must be non-negative (you can't subtract from a counter).
   *
   * @param value - Value to add (must be >= 0)
   * @param attributes - Additional attributes for this measurement
   * @throws Error if value is negative
   *
   * @example
   * ```typescript
   * // Simple increment
   * counter.add(1);
   *
   * // Batch processing
   * counter.add(batchSize, {
   *   "batch.id": "batch_001",
   *   "processing.time": processingTime
   * });
   *
   * // Conditional counting
   * if (operation.success) {
   *   counter.add(1, { "result": "success" });
   * }
   * ```
   */
  add(value: number, attributes: Record<string, unknown> = {}): void {
    if (value < 0) {
      throw new Error("Counter values must be non-negative");
    }
    this.value += value;

    // Send the new total to the collector
    this.client.sendCounter(
      this.name,
      this.description,
      this.unit,
      this.value,
      attributes
    );
  }

  /**
   * 📊 Get the current counter value.
   *
   * @returns The current cumulative value
   *
   * @example
   * ```typescript
   * const currentTotal = counter.getValue();
   * console.log(`Processed ${currentTotal} items so far`);
   * ```
   */
  getValue(): number {
    return this.value;
  }
}

/**
 * 📊 A gauge instrument that tracks current values.
 *
 * Gauges are perfect for tracking things that can go up or down, like
 * fuel levels, temperature, queue sizes, or active connections.
 *
 * Unlike counters, gauges represent the current state of something rather
 * than a cumulative total. You can set them to any value, add to them,
 * or subtract from them.
 *
 * @example
 * ```typescript
 * const gauge = new RednetGauge(client, "queue_size", "Items in queue", "items");
 *
 * // Set absolute values
 * gauge.set(42);
 *
 * // Relative changes
 * gauge.add(5);      // Add 5 items
 * gauge.subtract(2); // Remove 2 items
 *
 * console.log(`Current queue size: ${gauge.getValue()}`);
 * ```
 */
export class RednetGauge {
  private client: RednetClient;
  private name: string;
  private description: string;
  private unit: string;
  private value: number = 0;

  /**
   * Create a new gauge instrument.
   *
   * @param client - RednetClient for sending data
   * @param name - Gauge name
   * @param description - Human-readable description
   * @param unit - Unit of measurement
   */
  constructor(
    client: RednetClient,
    name: string,
    description: string,
    unit: string
  ) {
    this.client = client;
    this.name = name;
    this.description = description;
    this.unit = unit;
  }

  /**
   * 📊 Set the gauge to a specific value.
   *
   * This sets the gauge to an absolute value and immediately sends it to the collector.
   *
   * @param value - The new gauge value
   * @param attributes - Additional attributes for this measurement
   *
   * @example
   * ```typescript
   * // Set fuel level
   * fuelGauge.set(turtle.getFuelLevel(), {
   *   "fuel.type": "coal",
   *   "max.capacity": 80000
   * });
   *
   * // Set temperature reading
   * tempGauge.set(sensor.getTemperature(), {
   *   "sensor.location": "reactor_core",
   *   "sensor.id": "temp_001"
   * });
   * ```
   */
  set(value: number, attributes: Record<string, unknown> = {}): void {
    this.value = value;

    // Send the new value to the collector
    this.client.sendGauge(
      this.name,
      this.description,
      this.unit,
      this.value,
      attributes
    );
  }

  /**
   * ➕ Add to the current gauge value.
   *
   * This increases the gauge by the specified amount.
   *
   * @param value - Value to add (can be negative to subtract)
   * @param attributes - Additional attributes for this measurement
   *
   * @example
   * ```typescript
   * // Add items to inventory
   * inventoryGauge.add(itemsAdded, { "item.type": "iron_ore" });
   *
   * // Increase power level
   * powerGauge.add(generatedPower, { "generator.type": "solar" });
   * ```
   */
  add(value: number, attributes: Record<string, unknown> = {}): void {
    this.value += value;
    this.set(this.value, attributes);
  }

  /**
   * ➖ Subtract from the current gauge value.
   *
   * This decreases the gauge by the specified amount.
   *
   * @param value - Value to subtract
   * @param attributes - Additional attributes for this measurement
   *
   * @example
   * ```typescript
   * // Remove items from inventory
   * inventoryGauge.subtract(itemsUsed, { "item.type": "coal" });
   *
   * // Consume fuel
   * fuelGauge.subtract(fuelConsumed, { "operation": "mining" });
   * ```
   */
  subtract(value: number, attributes: Record<string, unknown> = {}): void {
    this.value -= value;
    this.set(this.value, attributes);
  }

  /**
   * 📊 Get the current gauge value.
   *
   * @returns The current gauge value
   *
   * @example
   * ```typescript
   * const currentLevel = gauge.getValue();
   * if (currentLevel < threshold) {
   *   client.warn("Low level warning", { "current": currentLevel });
   * }
   * ```
   */
  getValue(): number {
    return this.value;
  }
}
