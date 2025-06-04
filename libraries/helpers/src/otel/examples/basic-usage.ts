// Basic usage examples for OpenTelemetry types and helpers

import {
  SimpleLogger,
  SimpleMetricsCollector,
  SeverityNumber,
  createStandardBuckets,
  createLogRecord,
  createNumberDataPoint,
  createGauge,
  createResource,
  createInstrumentationScope,
} from "../index";

// Example 1: Basic Logging
export function loggingExample() {
  // Create a logger for a ComputerCraft turtle
  const logger = new SimpleLogger("minecraft-turtle", "1.0.0", {
    "turtle.id": "turtle-001",
    "turtle.type": "mining",
    "location.world": "overworld",
  });

  // Log some events
  logger.info("Turtle started mining operation", {
    "operation.type": "strip_mine",
    "location.x": 100,
    "location.y": 64,
    "location.z": 200,
  });

  logger.debug("Checking fuel level", {
    "fuel.current": 1500,
    "fuel.max": 2000,
  });

  logger.warn("Low fuel warning", {
    "fuel.current": 200,
    "fuel.threshold": 500,
  });

  logger.error("Block mining failed", {
    "block.type": "minecraft:obsidian",
    "error.reason": "insufficient_tool_level",
  });

  // Get the logs
  const logsData = logger.flush();
  return logsData;
}

// Example 2: Basic Metrics
export function metricsExample() {
  // Create a metrics collector for a ComputerCraft turtle
  const metrics = new SimpleMetricsCollector("minecraft-turtle", "1.0.0", {
    "turtle.id": "turtle-001",
    "turtle.type": "mining",
    "location.world": "overworld",
  });

  // Add some metrics

  // Counter: Total blocks mined
  metrics.addCounter(
    "blocks_mined_total",
    "Total number of blocks mined by the turtle",
    "blocks",
    150,
    {
      "block.type": "minecraft:stone",
      "tool.type": "diamond_pickaxe",
    }
  );

  // Gauge: Current fuel level
  metrics.addGauge(
    "fuel_level",
    "Current fuel level of the turtle",
    "units",
    1200,
    {
      "fuel.type": "coal",
    }
  );

  // Gauge: Current inventory slots used
  metrics.addGauge(
    "inventory_slots_used",
    "Number of inventory slots currently in use",
    "slots",
    12,
    {
      "inventory.max_slots": 16,
    }
  );

  // Histogram: Mining operation duration
  metrics.addHistogram(
    "mining_operation_duration",
    "Duration of mining operations",
    "seconds",
    25, // count of operations
    125.5, // sum of durations
    [
      { bound: 1.0, count: 2 },
      { bound: 5.0, count: 8 },
      { bound: 10.0, count: 12 },
      { bound: 30.0, count: 3 },
    ],
    {
      "operation.type": "single_block_mine",
    }
  );

  // Get the metrics
  const metricsData = metrics.flush();
  return metricsData;
}

// Example 3: Working with raw types
export function rawTypesExample() {
  // You can also work directly with the types if you need more control

  // Create a log record manually
  const logRecord = createLogRecord({
    body: "Custom log message",
    severity: SeverityNumber.INFO,
    attributes: {
      "custom.field": "custom_value",
      "numeric.field": 42,
    },
  });

  // Create a metric manually
  const dataPoint = createNumberDataPoint(100, {
    "location.x": 50,
    "location.y": 64,
  });

  const gauge = createGauge("custom_gauge", "A custom gauge metric", "units", [
    dataPoint,
  ]);

  return { logRecord, gauge };
}
