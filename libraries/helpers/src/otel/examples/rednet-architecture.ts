// Example of the new Rednet-based architecture
// Clients send metrics and logs immediately, collector handles batching

import { RednetClient, RednetInstrumentClient } from "..";
import { RednetCollector } from "../collector";
import { SeverityNumber } from "../types/logs";

// Example: Turtle client sending both metrics and logs immediately
export function turtleClientExample() {
  // Create a unified client that sends to collector (computer ID 1)
  const client = new RednetClient(
    1, // collector computer ID
    "minecraft-turtle",
    "1.0.0",
    {
      "turtle.id": "turtle-001",
      "turtle.type": "mining",
      "location.world": "overworld",
      "location.x": 100,
      "location.y": 64,
      "location.z": 200,
    }
  );

  // Send logs immediately
  client.info("Turtle started mining operation", {
    "operation.type": "strip_mine",
    "location.x": 100,
    "location.y": 64,
    "location.z": 200,
  });

  // Send metrics immediately
  client.sendCounter("blocks_mined_total", "Total blocks mined", "blocks", 1, {
    "block.type": "minecraft:stone",
  });

  client.sendGauge("fuel_level", "Current fuel level", "units", 1950, {
    "fuel.type": "coal",
  });

  // Instrument approach: create instruments that send immediately
  const instruments = new RednetInstrumentClient(client);

  const blocksCounter = instruments.createCounter(
    "blocks_mined_total",
    "Total blocks mined",
    "blocks"
  );
  const fuelGauge = instruments.createGauge(
    "fuel_level",
    "Current fuel level",
    "units"
  );

  // Set initial fuel
  fuelGauge.set(2000);
  client.info("Fuel tank filled", { "fuel.level": 2000 });

  // Simulate mining operations
  for (let i = 0; i < 10; i++) {
    // Mine a block - sends immediately to collector
    blocksCounter.add(1, { "block.type": "stone" });
    client.debug("Block mined", {
      "block.type": "stone",
      "block.number": i + 1,
    });

    // Use fuel - sends immediately to collector
    fuelGauge.subtract(10);

    // Update location as turtle moves
    if (i % 3 === 0) {
      client.updateResource({
        "location.x": 100 + i,
        "location.z": 200 + i,
      });
      client.info("Turtle moved", {
        "location.x": 100 + i,
        "location.z": 200 + i,
      });
    }

    // Warn if fuel is getting low
    if (fuelGauge.getValue() < 1000) {
      client.warn("Low fuel warning", {
        "fuel.current": fuelGauge.getValue(),
        "fuel.threshold": 1000,
      });
    }
  }

  client.info("Mining operation completed", {
    "blocks.mined": blocksCounter.getValue(),
    "fuel.remaining": fuelGauge.getValue(),
  });

  return {
    totalBlocks: blocksCounter.getValue(),
    currentFuel: fuelGauge.getValue(),
  };
}

// Example: Central collector receiving and batching both metrics and logs
export function collectorExample() {
  // Create collector with separate OTLP endpoints for metrics and logs
  const collector = new RednetCollector({
    batchInterval: 10000, // 10 seconds
    maxBatchSize: 100,
    otlpMetricsEndpoint: "http://grafana:4318/v1/metrics",
    otlpLogsEndpoint: "http://grafana:4318/v1/logs",
    otlpHeaders: {
      Authorization: "Bearer your-api-key",
    },
    protocol: "otel_telemetry",
  });

  // Start the collector
  collector.start();

  // Simulate receiving mixed telemetry from multiple turtles
  const telemetryData = [
    // Metrics
    {
      telemetryType: "metric" as const,
      type: "counter" as const,
      name: "blocks_mined_total",
      description: "Total blocks mined",
      unit: "blocks",
      value: 5,
      attributes: { "turtle.id": "turtle-001", "block.type": "stone" },
      timestamp: os.epoch("utc") * 1_000_000,
      resource: {
        "service.name": "minecraft-turtle",
        "turtle.id": "turtle-001",
      },
      scope: { name: "minecraft-turtle", version: "1.0.0" },
    },
    // Logs
    {
      telemetryType: "log" as const,
      body: "Started mining operation",
      severity: SeverityNumber.INFO,
      attributes: { "turtle.id": "turtle-001", "operation.type": "strip_mine" },
      timestamp: os.epoch("utc") * 1_000_000,
      resource: {
        "service.name": "minecraft-turtle",
        "turtle.id": "turtle-001",
      },
      scope: { name: "minecraft-turtle", version: "1.0.0" },
    },
    {
      telemetryType: "metric" as const,
      type: "gauge" as const,
      name: "fuel_level",
      description: "Current fuel level",
      unit: "units",
      value: 1950,
      attributes: { "turtle.id": "turtle-001" },
      timestamp: os.epoch("utc") * 1_000_000,
      resource: {
        "service.name": "minecraft-turtle",
        "turtle.id": "turtle-001",
      },
      scope: { name: "minecraft-turtle", version: "1.0.0" },
    },
    {
      telemetryType: "log" as const,
      body: "Low fuel warning",
      severity: SeverityNumber.WARN,
      attributes: {
        "turtle.id": "turtle-001",
        "fuel.current": 950,
        "fuel.threshold": 1000,
      },
      timestamp: os.epoch("utc") * 1_000_000,
      resource: {
        "service.name": "minecraft-turtle",
        "turtle.id": "turtle-001",
      },
      scope: { name: "minecraft-turtle", version: "1.0.0" },
    },
    {
      telemetryType: "metric" as const,
      type: "counter" as const,
      name: "blocks_mined_total",
      description: "Total blocks mined",
      unit: "blocks",
      value: 12,
      attributes: { "turtle.id": "turtle-002", "block.type": "cobblestone" },
      timestamp: os.epoch("utc") * 1_000_000,
      resource: {
        "service.name": "minecraft-turtle",
        "turtle.id": "turtle-002",
      },
      scope: { name: "minecraft-turtle", version: "1.0.0" },
    },
  ];

  // Process received telemetry
  for (const telemetry of telemetryData) {
    collector.processTelemetry(telemetry);
  }

  // Get stats
  const stats = collector.getStats();

  // Manually flush for this example
  const exportedData = collector.flush();

  return {
    stats,
    exportedData,
  };
}

// Example: ComputerCraft implementation pattern
export function computerCraftPattern() {
  // This shows how you'd structure the code in actual ComputerCraft

  return {
    // Turtle code (client)
    turtleCode: `
-- turtle_telemetry.lua
local client = RednetClient.new(1, "minecraft-turtle", "1.0.0", {
  ["turtle.id"] = tostring(os.getComputerID()),
  ["turtle.type"] = "mining"
})

local instruments = RednetInstrumentClient.new(client)
local blocksCounter = instruments:createCounter("blocks_mined_total", "Total blocks mined", "blocks")
local fuelGauge = instruments:createGauge("fuel_level", "Current fuel level", "units")

-- Mining loop
while true do
  if turtle.dig() then
    blocksCounter:add(1, {["block.type"] = "stone"})
    client:debug("Block mined", {["block.type"] = "stone"})
  end
  
  if turtle.forward() then
    local fuelLevel = turtle.getFuelLevel()
    fuelGauge:set(fuelLevel)
    
    if fuelLevel < 100 then
      client:warn("Low fuel warning", {
        ["fuel.current"] = fuelLevel,
        ["fuel.threshold"] = 100
      })
    end
  else
    client:error("Failed to move forward", {
      ["fuel.level"] = turtle.getFuelLevel(),
      ["position"] = "blocked"
    })
  end
  
  sleep(1)
end
    `,

    // Collector code (central server)
    collectorCode: `
-- collector.lua
local collector = RednetCollector.new({
  batchInterval = 30000,
  maxBatchSize = 1000,
  otlpMetricsEndpoint = "http://grafana:4318/v1/metrics",
  otlpLogsEndpoint = "http://grafana:4318/v1/logs",
  protocol = "otel_telemetry"
})

collector:start()

while true do
  local senderId, message, protocol = rednet.receive("otel_telemetry", 1)
  if senderId and message then
    collector:processTelemetry(message)
  end
  
  collector:tick()
  sleep(0.1)
end
    `,
  };
}

// Example: Multiple turtle types with different metrics and logs
export function multiTurtleExample() {
  const collectorId = 1;

  // Mining turtle
  const miningTurtle = new RednetClient(
    collectorId,
    "minecraft-turtle",
    "1.0.0",
    {
      "turtle.id": "turtle-mining-001",
      "turtle.type": "mining",
      "turtle.role": "quarry",
    }
  );

  // Farming turtle
  const farmingTurtle = new RednetClient(
    collectorId,
    "minecraft-turtle",
    "1.0.0",
    {
      "turtle.id": "turtle-farming-001",
      "turtle.type": "farming",
      "turtle.role": "wheat_farm",
    }
  );

  // Building turtle
  const buildingTurtle = new RednetClient(
    collectorId,
    "minecraft-turtle",
    "1.0.0",
    {
      "turtle.id": "turtle-building-001",
      "turtle.type": "building",
      "turtle.role": "construction",
    }
  );

  // Each turtle sends different metrics and logs

  // Mining turtle
  miningTurtle.info("Mining operation started", { "operation.type": "quarry" });
  miningTurtle.sendCounter(
    "blocks_mined_total",
    "Blocks mined",
    "blocks",
    150,
    {
      "block.type": "stone",
    }
  );
  miningTurtle.sendGauge("depth_level", "Current mining depth", "blocks", 45);
  miningTurtle.debug("Reached target depth", {
    "depth.target": 45,
    "depth.current": 45,
  });

  // Farming turtle
  farmingTurtle.info("Harvest cycle started", { "crop.type": "wheat" });
  farmingTurtle.sendCounter(
    "crops_harvested_total",
    "Crops harvested",
    "crops",
    64,
    {
      "crop.type": "wheat",
    }
  );
  farmingTurtle.sendGauge(
    "growth_stage_avg",
    "Average crop growth stage",
    "stage",
    6.2
  );
  farmingTurtle.info("Harvest completed", {
    "crops.harvested": 64,
    "growth.avg": 6.2,
  });

  // Building turtle
  buildingTurtle.info("Construction started", { "blueprint.name": "house_01" });
  buildingTurtle.sendCounter(
    "blocks_placed_total",
    "Blocks placed",
    "blocks",
    89,
    {
      "block.type": "cobblestone",
    }
  );
  buildingTurtle.sendGauge(
    "blueprint_progress",
    "Blueprint completion",
    "percent",
    23.5
  );
  buildingTurtle.warn("Material shortage", {
    "material.type": "cobblestone",
    "material.needed": 200,
    "material.available": 150,
  });

  return {
    miningStats: { blocks: 150, depth: 45 },
    farmingStats: { crops: 64, growth: 6.2 },
    buildingStats: { placed: 89, progress: 23.5 },
  };
}

// Example: Error handling and recovery
export function errorHandlingExample() {
  const client = new RednetClient(1, "minecraft-turtle", "1.0.0", {
    "turtle.id": "turtle-error-demo",
  });

  try {
    // Simulate some operation that might fail
    const success = Math.random() > 0.5;

    if (success) {
      client.sendCounter(
        "operations_success_total",
        "Successful operations",
        "operations",
        1
      );
      client.info("Operation completed successfully", {
        "operation.duration": 1.5,
      });
    } else {
      client.sendCounter(
        "operations_failed_total",
        "Failed operations",
        "operations",
        1
      );
      client.error("Operation failed", {
        "error.type": "timeout",
        "error.message": "Operation timed out after 30 seconds",
      });
    }
  } catch (error) {
    client.sendCounter(
      "operations_error_total",
      "Operations with errors",
      "operations",
      1
    );
    client.fatal("Unexpected error occurred", {
      "error.type": "exception",
      "error.message": String(error),
    });
  }

  return { success: true };
}
