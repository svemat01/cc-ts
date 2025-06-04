// Example comparing snapshot-style vs instrument-style APIs

import { SimpleMetricsCollector } from "../helpers/metrics";
import { Meter } from "../helpers/instruments";

// Example: ComputerCraft turtle mining operations

export function snapshotStyleExample() {
  const metrics = new SimpleMetricsCollector("minecraft-turtle", "1.0.0", {
    "turtle.id": "turtle-001",
  });

  // Simulate mining operations
  let totalBlocksMined = 0;
  let currentFuelLevel = 2000;
  const miningDurations: number[] = [];

  // Mining loop simulation
  for (let i = 0; i < 10; i++) {
    // Mine a block
    totalBlocksMined++;
    currentFuelLevel -= 10;
    const duration = Math.random() * 5; // 0-5 seconds
    miningDurations.push(duration);

    // Every 5 operations, record metrics
    if (i % 5 === 4) {
      // Record current state as metrics
      metrics.addCounter(
        "blocks_mined_total",
        "Total blocks mined",
        "blocks",
        totalBlocksMined,
        { "block.type": "stone" }
      );

      metrics.addGauge(
        "fuel_level",
        "Current fuel level",
        "units",
        currentFuelLevel
      );

      // Calculate histogram data manually
      const count = miningDurations.length;
      const sum = miningDurations.reduce((a, b) => a + b, 0);
      const bucketData = [
        { bound: 1.0, count: miningDurations.filter((d) => d <= 1.0).length },
        { bound: 2.0, count: miningDurations.filter((d) => d <= 2.0).length },
        { bound: 5.0, count: miningDurations.filter((d) => d <= 5.0).length },
      ];

      metrics.addHistogram(
        "mining_duration",
        "Mining operation duration",
        "seconds",
        count,
        sum,
        bucketData
      );
    }
  }

  const data = metrics.flush();
  return data;
}

export function instrumentStyleExample() {
  const collector = new SimpleMetricsCollector("minecraft-turtle", "1.0.0", {
    "turtle.id": "turtle-002",
  });

  const meter = new Meter(collector);

  // Create instruments once
  const blocksMinedCounter = meter.createCounter("blocks_mined_total", {
    description: "Total blocks mined",
    unit: "blocks",
  });

  const fuelGauge = meter.createGauge("fuel_level", {
    description: "Current fuel level",
    unit: "units",
  });

  const miningDurationHistogram = meter.createHistogram("mining_duration", {
    description: "Mining operation duration",
    unit: "seconds",
    buckets: [1.0, 2.0, 5.0, 10.0],
  });

  // Set initial fuel level
  fuelGauge.set(2000);

  // Mining loop simulation
  for (let i = 0; i < 10; i++) {
    // Mine a block - just increment the counter
    blocksMinedCounter.add(1, { "block.type": "stone" });

    // Use fuel - subtract from gauge
    fuelGauge.subtract(10);

    // Record mining duration
    const duration = Math.random() * 5; // 0-5 seconds
    miningDurationHistogram.record(duration);
  }

  // Get final metrics
  const data = collector.flush();

  return {
    data,
    stats: {
      counterValue: blocksMinedCounter.getValue(),
      gaugeValue: fuelGauge.getValue(),
      histogramStats: miningDurationHistogram.getStats(),
    },
  };
}

export function hybridExample() {
  const collector = new SimpleMetricsCollector("minecraft-turtle", "1.0.0", {
    "turtle.id": "turtle-003",
  });

  const meter = new Meter(collector);

  // Use instruments for real-time tracking
  const blocksCounter = meter.createCounter("blocks_mined_total");
  const fuelGauge = meter.createGauge("fuel_level");

  fuelGauge.set(2000);

  // Simulate some operations
  for (let i = 0; i < 5; i++) {
    blocksCounter.add(1);
    fuelGauge.subtract(10);
  }

  // But also add snapshot-style metrics for external data
  collector.addGauge(
    "server_tps",
    "Server ticks per second",
    "tps",
    19.8, // Data from server
    { "server.name": "minecraft-server" }
  );

  collector.addCounter(
    "chat_messages_total",
    "Total chat messages seen",
    "messages",
    1337, // Data from chat log
    { channel: "global" }
  );

  const data = collector.flush();
  return data;
}

// Comparison function
export function compareApproaches(): {
  snapshotTime: number;
  instrumentTime: number;
  snapshotMetricsCount: number;
  instrumentMetricsCount: number;
} {
  const iterations = 1000;

  // Test snapshot style
  const start1 = os.epoch("utc");
  const collector1 = new SimpleMetricsCollector("test-service");
  for (let i = 0; i < iterations; i++) {
    collector1.addCounter("test_counter", "Test", "count", i);
  }
  const data1 = collector1.flush();
  const time1 = os.epoch("utc") - start1;

  // Test instrument style
  const start2 = os.epoch("utc");
  const collector2 = new SimpleMetricsCollector("test-service");
  const meter = new Meter(collector2);
  const counter = meter.createCounter("test_counter", {
    description: "Test",
    unit: "count",
  });
  for (let i = 0; i < iterations; i++) {
    counter.add(1);
  }
  const data2 = collector2.flush();
  const time2 = os.epoch("utc") - start2;

  return {
    snapshotTime: time1,
    instrumentTime: time2,
    snapshotMetricsCount:
      data1.resourceMetrics[0].scopeMetrics[0].metrics.length,
    instrumentMetricsCount:
      data2.resourceMetrics[0].scopeMetrics[0].metrics.length,
  };
}
