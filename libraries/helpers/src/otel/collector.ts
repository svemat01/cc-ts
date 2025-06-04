/**
 * 🏭 OpenTelemetry Rednet Collector for ComputerCraft
 *
 * The powerhouse behind your telemetry infrastructure! This module provides a central collector
 * that receives metrics and logs from multiple clients over Rednet, batches them efficiently,
 * and exports to external OpenTelemetry Protocol (OTLP) endpoints. Perfect for building
 * comprehensive monitoring systems for your ComputerCraft empire! 🏰📊
 *
 * ## 🌟 Key Features
 * - 📡 **Rednet Reception**: Automatically receives telemetry from multiple clients
 * - 📦 **Smart Batching**: Configurable batching for efficient network usage
 * - 🔄 **OTLP Export**: Native support for OpenTelemetry Protocol endpoints
 * - 📊 **Metric Aggregation**: Proper handling of counters, gauges, and histograms
 * - 🧠 **Memory Management**: Automatic cleanup to prevent memory leaks
 * - 📈 **Real-time Stats**: Built-in monitoring of collector performance
 * - 🔧 **Flexible Configuration**: Customizable batch sizes, intervals, and endpoints
 *
 * ## 🎮 Perfect For
 * - **Central Monitoring Hub**: Collect data from hundreds of turtles and computers
 * - **Performance Analytics**: Aggregate metrics for trend analysis and alerting
 * - **Log Aggregation**: Centralize logs from distributed automation systems
 * - **OTLP Integration**: Bridge ComputerCraft telemetry to external monitoring systems
 * - **Real-time Dashboards**: Feed data to Grafana, Prometheus, or other tools
 * - **Debugging Infrastructure**: Centralized logging for complex distributed systems
 *
 * ## 🚨 Important Notes
 * - **Resource Requirements**: Collectors need sufficient memory for batching and aggregation
 * - **Network Capacity**: Consider bandwidth when setting batch intervals and sizes
 * - **OTLP Endpoints**: Requires HTTP access to external endpoints (if using OTLP export)
 * - **State Management**: Counter states are maintained for proper aggregation
 * - **Event Loop Required**: Needs an active event loop for Rednet message processing
 *
 * @example Basic Collector Setup
 * ```typescript
 * import { RednetCollector } from "@cc-ts/helpers/otel";
 * import { runOsEventLoop } from "@cc-ts/helpers/scheduler";
 *
 * // Create and configure the collector
 * const collector = new RednetCollector({
 *   batchInterval: 30000,              // Batch every 30 seconds
 *   maxBatchSize: 1000,               // Max 1000 items per batch
 *   otlpMetricsEndpoint: "http://prometheus:9090/api/v1/otlp/v1/metrics",
 *   otlpLogsEndpoint: "http://loki:3100/otlp/v1/logs",
 *   otlpHeaders: {
 *     "Authorization": "Bearer your-token-here"
 *   }
 * });
 *
 * // Start the collector
 * collector.start();
 *
 * // Run the event loop to process Rednet messages
 * runOsEventLoop();
 * ```
 *
 * @example High-Performance Setup
 * ```typescript
 * // Configuration for high-throughput environments
 * const collector = new RednetCollector({
 *   batchInterval: 10000,              // Faster batching (10s)
 *   maxBatchSize: 5000,               // Larger batches
 *   counterStateTTL: 7200000,         // 2 hour TTL for counter states
 *   maxCounterStates: 50000,          // More counter states
 *   protocol: "high_perf_telemetry"   // Custom protocol
 * });
 *
 * collector.start();
 *
 * // Monitor collector performance
 * setInterval(() => {
 *   const stats = collector.getStats();
 *   console.log(`Pending: ${stats.pendingTelemetry}, States: ${stats.counterStates}`);
 * }, 5000);
 * ```
 *
 * @example Custom Processing Pipeline
 * ```typescript
 * const collector = new RednetCollector({
 *   batchInterval: 15000,
 *   maxBatchSize: 2000
 * });
 *
 * collector.start();
 *
 * // Custom processing loop
 * async function customProcessing() {
 *   while (true) {
 *     await asyncSleep(10000);
 *
 *     // Get current data without clearing
 *     const stats = collector.getStats();
 *
 *     if (stats.pendingTelemetry > 500) {
 *       console.log("High telemetry volume detected");
 *       // Maybe trigger immediate flush
 *       collector.tick();
 *     }
 *
 *     // Custom log analysis
 *     const logs = collector.getCollectedLogs();
 *     // Process logs for alerts, etc.
 *   }
 * }
 *
 * void customProcessing();
 * runOsEventLoop();
 * ```
 *
 * @example Multi-Collector Architecture
 * ```typescript
 * // Separate collectors for different data types
 * const metricsCollector = new RednetCollector({
 *   protocol: "metrics_only",
 *   otlpMetricsEndpoint: "http://prometheus:9090/api/v1/otlp/v1/metrics",
 *   batchInterval: 30000
 * });
 *
 * const logsCollector = new RednetCollector({
 *   protocol: "logs_only",
 *   otlpLogsEndpoint: "http://loki:3100/otlp/v1/logs",
 *   batchInterval: 10000  // Faster log processing
 * });
 *
 * metricsCollector.start();
 * logsCollector.start();
 *
 * runOsEventLoop();
 * ```
 *
 * @module otel/collector
 */

// Central Rednet collector that receives metrics and logs, batches to external APIs
// Handles aggregation, batching, and OTLP export for both telemetry types

import { SimpleMetricsCollector } from "./helpers/metrics";
import { SimpleLogger } from "./helpers/logs";
import {
  RednetTelemetry,
  RednetMetric,
  RednetLog,
  isRednetTelemetry,
} from "./client";
import { MetricsData } from "./types/metrics";
import { LogsData } from "./types/logs";

import { asyncSleep, on, waitForAnyEvent } from "../scheduler";

/**
 * 🔧 Configuration for the collector.
 *
 * Fine-tune your collector's behavior for optimal performance in your environment.
 * Balance between real-time responsiveness and efficient resource usage.
 *
 * @example
 * ```typescript
 * const config: CollectorConfig = {
 *   batchInterval: 30000,              // 30 second batching
 *   maxBatchSize: 1000,               // Max 1000 items per batch
 *   otlpMetricsEndpoint: "http://prometheus:9090/api/v1/otlp/v1/metrics",
 *   otlpLogsEndpoint: "http://loki:3100/otlp/v1/logs",
 *   otlpHeaders: {
 *     "Authorization": "Bearer token123",
 *     "X-Scope-OrgID": "tenant1"
 *   },
 *   protocol: "otel_telemetry",
 *   counterStateTTL: 3600000,          // 1 hour TTL
 *   maxCounterStates: 10000            // Max 10k counter states
 * };
 * ```
 */
export interface CollectorConfig {
  /** Interval between batch processing in milliseconds */
  batchInterval: number;
  /** Maximum number of telemetry items per batch */
  maxBatchSize: number;
  /** OTLP endpoint URL for metrics (optional) */
  otlpMetricsEndpoint?: string;
  /** OTLP endpoint URL for logs (optional) */
  otlpLogsEndpoint?: string;
  /** HTTP headers to include with OTLP requests */
  otlpHeaders?: Record<string, string>;
  /** Rednet protocol to listen on */
  protocol: string;
  /** Time to keep counter states before cleanup in milliseconds (default: 1 hour) */
  counterStateTTL?: number;
  /** Maximum number of counter states to keep (default: 10000) */
  maxCounterStates?: number;
}

/**
 * 🏭 Central collector that receives metrics and logs via Rednet and exports to OTLP.
 *
 * This is the heart of your telemetry infrastructure! The collector automatically
 * receives telemetry data from clients, intelligently batches it for efficiency,
 * and exports to external monitoring systems using the OpenTelemetry Protocol.
 *
 * The collector handles all the complex details of metric aggregation, counter state
 * management, and memory cleanup so you can focus on analyzing your data.
 *
 * @example Basic Usage
 * ```typescript
 * const collector = new RednetCollector({
 *   batchInterval: 30000,
 *   maxBatchSize: 1000,
 *   otlpMetricsEndpoint: "http://prometheus:9090/api/v1/otlp/v1/metrics"
 * });
 *
 * collector.start();
 *
 * // The collector now automatically processes incoming telemetry
 * runOsEventLoop();
 * ```
 */
export class RednetCollector {
  private config: CollectorConfig;
  private logger: SimpleLogger;
  private receivedTelemetry: RednetTelemetry[] = [];
  private isRunning: boolean = false;
  private lastFlush: number = 0;

  // Aggregation state for counters (need to track cumulative values)
  private counterStates: Map<string, { value: number; lastUpdate: number }> =
    new Map();

  // Event listener cleanup reference
  private rednetEventListener?: (
    id: number,
    message: unknown,
    protocol?: string
  ) => void;

  /**
   * Create a new Rednet collector.
   *
   * @param config - Collector configuration options
   *
   * @example
   * ```typescript
   * const collector = new RednetCollector({
   *   batchInterval: 30000,              // Process batches every 30 seconds
   *   maxBatchSize: 1000,               // Max 1000 items per batch
   *   otlpMetricsEndpoint: "http://prometheus:9090/api/v1/otlp/v1/metrics",
   *   otlpLogsEndpoint: "http://loki:3100/otlp/v1/logs",
   *   otlpHeaders: {
   *     "Authorization": "Bearer your-api-key",
   *     "Content-Type": "application/x-protobuf"
   *   },
   *   protocol: "otel_telemetry",
   *   counterStateTTL: 3600000,          // 1 hour counter state TTL
   *   maxCounterStates: 10000            // Max 10k counter states
   * });
   * ```
   */
  constructor(config: Partial<CollectorConfig> = {}) {
    this.config = {
      batchInterval: 30000, // 30 seconds
      maxBatchSize: 1000,
      protocol: "otel_telemetry",
      counterStateTTL: 3600000, // 1 hour
      maxCounterStates: 10000,
      ...config,
    };

    // this.logger = new FileLogger(
    //   "otel-collector-internal.ndjson",
    //   "otel-collector-internal",
    //   "1.0.0",
    //   {
    //     "collector.type": "rednet",
    //   }
    // );

    this.logger = new SimpleLogger("otel-collector-internal", "1.0.0", {
      "collector.type": "rednet",
    });
  }

  /**
   * 🚀 Start the collector - begins listening for Rednet messages.
   *
   * This starts the collector's main processing loop. It will begin listening
   * for telemetry data on the configured Rednet protocol and start the batching
   * timer for periodic exports.
   *
   * @example
   * ```typescript
   * const collector = new RednetCollector(config);
   *
   * // Start the collector
   * collector.start();
   *
   * // Now it's listening for telemetry data
   * console.log("Collector started and listening...");
   *
   * // Make sure you have an event loop running!
   * runOsEventLoop();
   * ```
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.info("Collector started", {
      "batch.interval": this.config.batchInterval,
      "batch.max_size": this.config.maxBatchSize,
      "metrics.endpoint": this.config.otlpMetricsEndpoint || "none",
      "logs.endpoint": this.config.otlpLogsEndpoint || "none",
    });

    // Start listening for Rednet messages
    this.startRednetListener();

    this.startTickLoop();
  }

  /**
   * 🛑 Stop the collector and clean up resources.
   *
   * Gracefully shuts down the collector, processes any remaining telemetry,
   * and cleans up memory. Call this when you're done collecting data.
   *
   * @example
   * ```typescript
   * // Graceful shutdown
   * collector.stop();
   * console.log("Collector stopped gracefully");
   * ```
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clean up event listener
    if (this.rednetEventListener) {
      // In a real implementation, you'd unregister the event listener
      // For now, we at least null the reference
      this.rednetEventListener = undefined;
    }

    // Process any remaining telemetry
    if (this.receivedTelemetry.length > 0) {
      this.processBatch();
    }

    // Clear counter states to free memory
    this.counterStates.clear();

    this.logger.info("Collector stopped", {
      "final.counter_states": 0,
      "final.pending_telemetry": 0,
    });
  }

  /**
   * 📦 Process received telemetry from Rednet.
   *
   * This is called automatically when telemetry data is received over Rednet.
   * You can also call it manually to inject telemetry data for testing.
   *
   * @param telemetry - The telemetry data to process
   *
   * @example
   * ```typescript
   * // Manual telemetry injection (useful for testing)
   * const testMetric: RednetTelemetry = {
   *   telemetryType: "metric",
   *   type: "counter",
   *   name: "test_counter",
   *   description: "Test counter",
   *   unit: "count",
   *   value: 42,
   *   attributes: {},
   *   timestamp: os.epoch("utc"),
   *   resource: { "service.name": "test" },
   *   scope: { name: "test", version: "1.0.0" }
   * };
   *
   * collector.processTelemetry(testMetric);
   * ```
   */
  processTelemetry(telemetry: RednetTelemetry): void {
    this.receivedTelemetry.push(telemetry);
    this.logger.debug("Received telemetry", {
      "telemetry.type": telemetry.telemetryType,
      "data.name":
        telemetry.telemetryType === "metric" ? telemetry.name : "log",
      "data.value":
        telemetry.telemetryType === "metric"
          ? typeof telemetry.value === "number"
            ? telemetry.value
            : "histogram"
          : telemetry.severity,
    });

    // If we've hit the batch size limit, process immediately
    if (this.receivedTelemetry.length >= this.config.maxBatchSize) {
      this.processBatch();
    }
  }

  /**
   * 🔄 Legacy method for backward compatibility.
   *
   * @deprecated Use {@link processTelemetry} instead
   * @param metric - The metric to process
   */
  processMetric(metric: RednetMetric): void {
    const telemetry: RednetTelemetry = {
      telemetryType: "metric",
      ...metric,
    };
    this.processTelemetry(telemetry);
  }

  /**
   * 📊 Get collector statistics and status.
   *
   * Returns detailed information about the collector's current state,
   * including pending telemetry, memory usage, and configuration.
   *
   * @returns Collector statistics object
   *
   * @example
   * ```typescript
   * const stats = collector.getStats();
   *
   * console.log(`Running: ${stats.isRunning}`);
   * console.log(`Pending telemetry: ${stats.pendingTelemetry}`);
   * console.log(`Counter states: ${stats.counterStates}`);
   * console.log(`Memory usage: ${stats.memoryUsage.counterStatesCount}/${stats.memoryUsage.maxCounterStates}`);
   *
   * // Check if we're approaching limits
   * if (stats.memoryUsage.counterStatesCount > stats.memoryUsage.maxCounterStates * 0.8) {
   *   console.log("Warning: Approaching counter state limit");
   * }
   * ```
   */
  getStats(): {
    isRunning: boolean;
    pendingTelemetry: number;
    pendingMetrics: number;
    pendingLogs: number;
    counterStates: number;
    config: CollectorConfig;
    memoryUsage: {
      counterStatesCount: number;
      maxCounterStates: number;
      counterStateTTL: number;
      oldestCounterStateAge?: number;
    };
  } {
    const pendingMetrics = this.receivedTelemetry.filter(
      (t) => t.telemetryType === "metric"
    ).length;
    const pendingLogs = this.receivedTelemetry.filter(
      (t) => t.telemetryType === "log"
    ).length;

    // Find oldest counter state
    let oldestAge: number | undefined;
    const now = os.epoch("utc");
    for (const [, state] of this.counterStates) {
      const age = now - state.lastUpdate;
      if (oldestAge === undefined || age > oldestAge) {
        oldestAge = age;
      }
    }

    return {
      isRunning: this.isRunning,
      pendingTelemetry: this.receivedTelemetry.length,
      pendingMetrics,
      pendingLogs,
      counterStates: this.counterStates.size,
      config: this.config,
      memoryUsage: {
        counterStatesCount: this.counterStates.size,
        maxCounterStates: this.config.maxCounterStates || 10000,
        counterStateTTL: this.config.counterStateTTL || 3600000,
        oldestCounterStateAge: oldestAge,
      },
    };
  }

  /**
   * 📋 Get internal collector logs.
   *
   * Returns logs generated by the collector itself for monitoring and debugging.
   *
   * @returns LogsData containing collector internal logs
   *
   * @example
   * ```typescript
   * const collectorLogs = collector.getCollectorLogs();
   *
   * // Analyze collector performance
   * for (const resourceLog of collectorLogs.resourceLogs) {
   *   for (const scopeLog of resourceLog.scopeLogs) {
   *     for (const logRecord of scopeLog.logRecords) {
   *       if (logRecord.severityNumber >= SeverityNumber.WARN) {
   *         console.log("Collector warning/error:", logRecord.body);
   *       }
   *     }
   *   }
   * }
   * ```
   */
  getCollectorLogs(): LogsData {
    return this.logger.getLogs();
  }

  /**
   * 📝 Get collected logs from clients.
   *
   * Returns all log data that has been collected from clients but not yet exported.
   * Useful for custom processing or analysis.
   *
   * @returns LogsData containing collected client logs
   *
   * @example
   * ```typescript
   * const clientLogs = collector.getCollectedLogs();
   *
   * // Custom log analysis
   * for (const resourceLog of clientLogs.resourceLogs) {
   *   for (const scopeLog of resourceLog.scopeLogs) {
   *     for (const logRecord of scopeLog.logRecords) {
   *       // Check for error patterns
   *       if (logRecord.body.includes("error") || logRecord.body.includes("failed")) {
   *         console.log("Error detected:", logRecord.body);
   *       }
   *     }
   *   }
   * }
   * ```
   */
  getCollectedLogs(): LogsData {
    const logs = this.receivedTelemetry.filter(
      (t) => t.telemetryType === "log"
    ) as (RednetTelemetry & { telemetryType: "log" })[];

    return this.buildLogsData(logs);
  }

  /**
   * 🚀 Flush all pending telemetry immediately.
   *
   * Forces immediate processing and export of all pending telemetry data,
   * regardless of batch interval or size settings.
   *
   * @returns Object containing the flushed metrics and logs data
   *
   * @example
   * ```typescript
   * // Force immediate flush before shutdown
   * const flushedData = collector.flush();
   *
   * console.log(`Flushed ${flushedData.metrics.resourceMetrics.length} metric resources`);
   * console.log(`Flushed ${flushedData.logs.resourceLogs.length} log resources`);
   *
   * // Now safe to stop the collector
   * collector.stop();
   * ```
   */
  flush(): { metrics: MetricsData; logs: LogsData } {
    const metrics = this.receivedTelemetry.filter(
      (t) => t.telemetryType === "metric"
    ) as (RednetTelemetry & { telemetryType: "metric" })[];
    const logs = this.receivedTelemetry.filter(
      (t) => t.telemetryType === "log"
    ) as (RednetTelemetry & { telemetryType: "log" })[];

    const metricsData = this.buildMetricsData(metrics);
    const logsData = this.buildLogsData(logs);

    // Clear the processed telemetry
    this.receivedTelemetry = [];

    this.logger.info("Manual flush completed", {
      "metrics.count": metrics.length,
      "logs.count": logs.length,
    });

    return { metrics: metricsData, logs: logsData };
  }

  /**
   * ⏰ Process a single tick of the collector.
   *
   * Manually trigger one cycle of the collector's processing logic.
   * This checks if it's time to process a batch and does so if needed.
   *
   * @example
   * ```typescript
   * // Manual tick processing (useful for testing or custom scheduling)
   * collector.tick();
   *
   * // Or in a custom loop
   * setInterval(() => {
   *   collector.tick();
   * }, 5000);
   * ```
   */
  tick(): void {
    const now = os.epoch("utc");
    const timeSinceLastFlush = now - this.lastFlush;

    if (
      timeSinceLastFlush >= this.config.batchInterval ||
      this.receivedTelemetry.length >= this.config.maxBatchSize
    ) {
      this.processBatch();
    }
  }

  /**
   * 🧹 Clean up old counter states to prevent memory leaks.
   *
   * Removes counter states that haven't been updated recently and enforces
   * the maximum counter state limit. Called automatically during processing.
   *
   * @private
   */
  private cleanupCounterStates(): void {
    const now = os.epoch("utc");
    const ttl = this.config.counterStateTTL || 3600000; // 1 hour default
    const maxStates = this.config.maxCounterStates || 10000;

    let cleanedCount = 0;

    // Remove expired states
    for (const [key, state] of this.counterStates) {
      if (now - state.lastUpdate > ttl) {
        this.counterStates.delete(key);
        cleanedCount++;
      }
    }

    // If still over limit, remove oldest states
    if (this.counterStates.size > maxStates) {
      const sortedStates = Array.from(this.counterStates.entries()).sort(
        (a, b) => a[1].lastUpdate - b[1].lastUpdate
      );

      const toRemove = this.counterStates.size - maxStates;
      for (let i = 0; i < toRemove; i++) {
        this.counterStates.delete(sortedStates[i][0]);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug("Cleaned up counter states", {
        "cleaned.count": cleanedCount,
        "remaining.count": this.counterStates.size,
        "cleanup.reason": cleanedCount > 0 ? "ttl_and_limit" : "none",
      });
    }
  }

  /**
   * Build proper MetricsData with preserved resource and scope information.
   */
  private buildMetricsData(
    metrics: (RednetTelemetry & { telemetryType: "metric" })[]
  ): MetricsData {
    const groupedMetrics = this.groupMetrics(metrics);
    const resourceMetrics: any[] = [];

    for (const [resourceKey, scopes] of groupedMetrics) {
      const resource = textutils.unserialiseJSON(resourceKey);
      const scopeMetrics: any[] = [];

      for (const [scopeKey, metricsList] of scopes) {
        const scope = textutils.unserialiseJSON(scopeKey);

        // Create a temporary collector for this resource/scope combination
        const tempCollector = new SimpleMetricsCollector(
          scope.name,
          scope.version,
          resource
        );

        this.logger.info("Adding metrics to temp collector", {
          scope,
          resource,
          "metrics.count": metricsList.length,
        });

        // Add metrics to the temporary collector
        this.addMetricsToTempCollector(tempCollector, metricsList);

        // Get the metrics data and extract the scope metrics
        const tempData = tempCollector.getMetrics();
        if (
          tempData.resourceMetrics.length > 0 &&
          tempData.resourceMetrics[0].scopeMetrics.length > 0
        ) {
          scopeMetrics.push(tempData.resourceMetrics[0].scopeMetrics[0]);
        }
      }

      if (scopeMetrics.length > 0) {
        resourceMetrics.push({
          resource: {
            attributes: Object.entries(resource).map(([key, value]) => ({
              key,
              value:
                typeof value === "string"
                  ? { stringValue: value }
                  : typeof value === "number"
                  ? { doubleValue: value }
                  : typeof value === "boolean"
                  ? { boolValue: value }
                  : { stringValue: String(value) },
            })),
            droppedAttributesCount: 0,
          },
          scopeMetrics,
          schemaUrl: "",
        });
      }
    }

    return { resourceMetrics };
  }

  /**
   * Build proper LogsData with preserved resource and scope information.
   */
  private buildLogsData(
    logs: (RednetTelemetry & { telemetryType: "log" })[]
  ): LogsData {
    const groupedLogs = this.groupLogs(logs);
    const resourceLogs: any[] = [];

    for (const [resourceKey, scopes] of groupedLogs) {
      const resource = textutils.unserialiseJSON(resourceKey);
      const scopeLogs: any[] = [];

      for (const [scopeKey, logsList] of scopes) {
        const scope = textutils.unserialiseJSON(scopeKey);

        // Create a temporary logger for this resource/scope combination
        const tempLogger = new SimpleLogger(
          scope.name,
          scope.version,
          resource
        );

        // Add logs to the temporary logger
        for (const log of logsList) {
          tempLogger.log(log.severity, log.body, log.attributes);
        }

        // Get the logs data and extract the scope logs
        const tempData = tempLogger.getLogs();
        if (
          tempData.resourceLogs.length > 0 &&
          tempData.resourceLogs[0].scopeLogs.length > 0
        ) {
          scopeLogs.push(tempData.resourceLogs[0].scopeLogs[0]);
        }
      }

      if (scopeLogs.length > 0) {
        resourceLogs.push({
          resource: {
            attributes: Object.entries(resource).map(([key, value]) => ({
              key,
              value:
                typeof value === "string"
                  ? { stringValue: value }
                  : typeof value === "number"
                  ? { doubleValue: value }
                  : typeof value === "boolean"
                  ? { boolValue: value }
                  : { stringValue: String(value) },
            })),
            droppedAttributesCount: 0,
          },
          scopeLogs,
          schemaUrl: "",
        });
      }
    }

    return { resourceLogs };
  }

  /**
   * Group metrics by resource and scope for proper OTLP structure.
   */
  private groupMetrics(
    metrics: (RednetTelemetry & { telemetryType: "metric" })[]
  ): Map<string, Map<string, RednetMetric[]>> {
    const grouped = new Map<string, Map<string, RednetMetric[]>>();

    for (const metric of metrics) {
      const resourceKey = textutils.serialiseJSON(metric.resource);
      const scopeKey = textutils.serialiseJSON(metric.scope);

      if (!grouped.has(resourceKey)) {
        grouped.set(resourceKey, new Map());
      }

      const scopes = grouped.get(resourceKey)!;
      if (!scopes.has(scopeKey)) {
        scopes.set(scopeKey, []);
      }

      // Convert back to RednetMetric format
      const { telemetryType, ...metricData } = metric;
      scopes.get(scopeKey)!.push(metricData as RednetMetric);
    }

    return grouped;
  }

  /**
   * Group logs by resource and scope for proper OTLP structure.
   */
  private groupLogs(
    logs: (RednetTelemetry & { telemetryType: "log" })[]
  ): Map<string, Map<string, RednetLog[]>> {
    const grouped = new Map<string, Map<string, RednetLog[]>>();

    for (const log of logs) {
      const resourceKey = textutils.serialiseJSON(log.resource);
      const scopeKey = textutils.serialiseJSON(log.scope);

      if (!grouped.has(resourceKey)) {
        grouped.set(resourceKey, new Map());
      }

      const scopes = grouped.get(resourceKey)!;
      if (!scopes.has(scopeKey)) {
        scopes.set(scopeKey, []);
      }

      // Convert back to RednetLog format
      const { telemetryType, ...logData } = log;
      scopes.get(scopeKey)!.push(logData as RednetLog);
    }

    return grouped;
  }

  /**
   * Add grouped metrics to a temporary collector, preserving counter state.
   */
  private addMetricsToTempCollector(
    collector: SimpleMetricsCollector,
    metrics: RednetMetric[]
  ): void {
    for (const metric of metrics) {
      switch (metric.type) {
        case "counter":
          this.processCounterForTempCollector(collector, metric);
          break;
        case "gauge":
          collector.addGauge(
            metric.name,
            metric.description,
            metric.unit,
            metric.value as number,
            metric.attributes
          );
          break;
        case "histogram":
          const histogramValue = metric.value as {
            count: number;
            sum: number;
            buckets: { bound: number; count: number }[];
          };
          collector.addHistogram(
            metric.name,
            metric.description,
            metric.unit,
            histogramValue.count,
            histogramValue.sum,
            histogramValue.buckets,
            metric.attributes
          );
          break;
      }
    }
  }

  /**
   * Process a counter metric with proper aggregation for temporary collector.
   */
  private processCounterForTempCollector(
    collector: SimpleMetricsCollector,
    metric: RednetMetric
  ): void {
    const key = `${textutils.serialiseJSON(metric.resource)}:${
      metric.name
    }:${textutils.serialiseJSON(metric.attributes)}`;
    const value = metric.value as number;

    // For counters, we want the latest cumulative value from each source
    const existing = this.counterStates.get(key);
    if (!existing || metric.timestamp > existing.lastUpdate) {
      this.counterStates.set(key, { value, lastUpdate: metric.timestamp });

      collector.addCounter(
        metric.name,
        metric.description,
        metric.unit,
        value,
        metric.attributes
      );
    }
  }

  /**
   * Start listening for Rednet messages.
   * In ComputerCraft, this would be implemented with actual Rednet calls.
   */
  private startRednetListener(): void {
    // Prevent duplicate listeners
    if (this.rednetEventListener) {
      return;
    }

    // Store the event listener function for cleanup
    this.rednetEventListener = (
      id: number,
      message: unknown,
      protocol?: string
    ) => {
      if (!this.isRunning) return; // Ignore messages when stopped
      if (protocol !== this.config.protocol) return;

      if (!isRednetTelemetry(message)) return;

      this.processTelemetry(message);
    };

    // In ComputerCraft, this would be something like:
    //
    // while (this.isRunning) {
    //   // const [senderId, message, protocol] =
    //   // if (senderId && message && protocol === this.config.protocol) {
    //   //   this.processTelemetry(message as RednetTelemetry);
    //   // }
    // }

    on("rednet_message", this.rednetEventListener);

    this.logger.debug("Started Rednet listener", {
      protocol: this.config.protocol,
    });
  }

  private async startTickLoop(): Promise<void> {
    this.logger.debug("Starting tick loop", {
      "batch.interval": this.config.batchInterval,
    });

    while (this.isRunning) {
      await asyncSleep(this.config.batchInterval);
      this.processBatch();

      // Clean up counter states periodically to prevent memory leaks
      this.cleanupCounterStates();
    }
  }

  /**
   * Process accumulated telemetry into OTLP format and export.
   */
  private async processBatch(): Promise<void> {
    if (this.receivedTelemetry.length === 0) {
      return;
    }

    const batchSize = this.receivedTelemetry.length;
    const metrics = this.receivedTelemetry.filter(
      (t) => t.telemetryType === "metric"
    ) as (RednetTelemetry & { telemetryType: "metric" })[];
    const logs = this.receivedTelemetry.filter(
      (t) => t.telemetryType === "log"
    ) as (RednetTelemetry & { telemetryType: "log" })[];

    this.logger.info("Processing batch", {
      "batch.size": batchSize,
      "metrics.count": metrics.length,
      "logs.count": logs.length,
    });

    // Process metrics
    if (metrics.length > 0) {
      const metricsData = this.buildMetricsData(metrics);

      // Export metrics if we have an endpoint
      if (this.config.otlpMetricsEndpoint) {
        await this.exportMetricsToOTLP(metricsData);
      } else {
        this.logger.debug("No metrics endpoint configured, skipping flush");
      }
    } else {
      this.logger.debug("No metrics to process");
    }

    // Process logs
    if (logs.length > 0) {
      const logsData = this.buildLogsData(logs);

      // Export logs if we have an endpoint
      if (this.config.otlpLogsEndpoint) {
        await this.exportLogsToOTLP(logsData);
      }
    }

    // Clear processed telemetry
    this.receivedTelemetry = [];

    this.logger.info("Batch processed", {
      "batch.size": batchSize,
      "metrics.exported": !!this.config.otlpMetricsEndpoint,
      "logs.exported": !!this.config.otlpLogsEndpoint,
    });

    this.lastFlush = os.epoch("utc");

    // Clean up old counter states to prevent memory leaks.
    this.cleanupCounterStates();
  }

  /**
   * Export metrics to OTLP endpoint.
   */
  private async exportMetricsToOTLP(metricsData: MetricsData): Promise<void> {
    if (!this.config.otlpMetricsEndpoint) {
      return;
    }

    try {
      // In ComputerCraft, this would use the http API
      // const response = http.post(this.config.otlpMetricsEndpoint, textutils.serialiseJSON(metricsData), {
      //   'Content-Type': 'application/json',
      //   ...this.config.otlpHeaders
      // });

      this.logger.info("Exporting metrics to OTLP", {
        "otlp.endpoint": this.config.otlpMetricsEndpoint,
        "metrics.count": metricsData.resourceMetrics.length,
        metrics: metricsData,
      });

      const url = this.config.otlpMetricsEndpoint;

      http.request({
        url,
        method: "POST",
        headers: convertToLuaMap({
          "Content-Type": "application/json",
          ...this.config.otlpHeaders,
        }),
        body: textutils.serialiseJSON(metricsData),
      });

      const response = await waitForAnyEvent(
        ["http_success", "http_failure"],
        (_, ...args) => args[0] === url
      );

      if (response[0] === "http_success") {
        this.logger.info("Exported metrics to OTLP", {
          "otlp.endpoint": this.config.otlpMetricsEndpoint,
          "metrics.count": metricsData.resourceMetrics.length,
        });
      } else {
        this.logger.error("Failed to export metrics", {
          "error.message": String(response[2]),
          "error.response": response[3]?.readAll(),
        });
      }
    } catch (error) {
      this.logger.error("Failed to export metrics", {
        "error.message": String(error),
      });
    }
  }

  /**
   * Export logs to OTLP endpoint.
   */
  private async exportLogsToOTLP(logsData: LogsData): Promise<void> {
    if (!this.config.otlpLogsEndpoint) {
      return;
    }

    try {
      // In ComputerCraft, this would use the http API
      // const response = http.post(this.config.otlpLogsEndpoint, textutils.serialiseJSON(logsData), {
      //   'Content-Type': 'application/json',
      //   ...this.config.otlpHeaders
      // });

      const url = this.config.otlpLogsEndpoint;

      http.request({
        url,
        method: "POST",
        headers: convertToLuaMap({
          "Content-Type": "application/json",
          ...this.config.otlpHeaders,
        }),
        body: textutils.serialiseJSON(logsData),
      });

      const response = await waitForAnyEvent(
        ["http_success", "http_failure"],
        (_, ...args) => args[0] === url
      );

      if (response[0] === "http_success") {
        this.logger.info("Exported logs to OTLP", {
          "otlp.endpoint": this.config.otlpLogsEndpoint,
          "logs.count": logsData.resourceLogs.length,
        });
      } else {
        this.logger.error("Failed to export logs", {
          "error.message": String(response[2]),
          "error.response": response[3],
          "otlp.endpoint": this.config.otlpLogsEndpoint,
        });
      }
    } catch (error) {
      this.logger.error("Failed to export logs", {
        "error.message": String(error),
        "otlp.endpoint": this.config.otlpLogsEndpoint,
      });
    }
  }
}

function convertToLuaMap<T>(obj: Record<string, T>): LuaMap<string, T> {
  const map = new LuaMap<string, T>();
  for (const [key, value] of Object.entries(obj)) {
    map.set(key, value);
  }
  return map;
}
