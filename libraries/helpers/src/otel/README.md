# OpenTelemetry TypeScript Types & Helpers

Clean, lightweight TypeScript types and helper utilities for working with OpenTelemetry protobuf data structures. Perfect for ComputerCraft projects or any application that needs to work with OTEL data without heavy dependencies.

## Features

- 🎯 **Complete TypeScript types** for OpenTelemetry logs and metrics protobuf schemas
- 🛠️ **Lightweight helper functions** for creating and manipulating OTEL data
- 🚀 **Simple APIs** for common use cases (logging, metrics collection)
- 📦 **Zero dependencies** - just pure TypeScript
- 🎮 **ComputerCraft friendly** - designed with Minecraft automation in mind

## Quick Start

### Basic Logging

```typescript
import { SimpleLogger, SeverityNumber } from './src/index.js';

// Create a logger for your service
const logger = new SimpleLogger('minecraft-turtle', '1.0.0', {
  'turtle.id': 'turtle-001',
  'turtle.type': 'mining'
});

// Log events with structured data
logger.info('Started mining operation', {
  'location.x': 100,
  'location.y': 64,
  'location.z': 200,
  'operation.type': 'strip_mine'
});

logger.warn('Low fuel warning', {
  'fuel.current': 200,
  'fuel.threshold': 500
});

// Get the logs as OTEL-compatible data
const logsData = logger.flush();
```

### Basic Metrics

```typescript
import { SimpleMetricsCollector } from './src/index.js';

// Create a metrics collector
const metrics = new SimpleMetricsCollector('minecraft-turtle', '1.0.0', {
  'turtle.id': 'turtle-001'
});

// Add different types of metrics

// Counter (always increasing)
metrics.addCounter(
  'blocks_mined_total',
  'Total blocks mined',
  'blocks',
  150,
  { 'block.type': 'stone' }
);

// Gauge (current value)
metrics.addGauge(
  'fuel_level',
  'Current fuel level',
  'units',
  1200
);

// Histogram (distribution of values)
metrics.addHistogram(
  'mining_duration',
  'Time to mine blocks',
  'seconds',
  25, // count
  125.5, // sum
  [
    { bound: 1.0, count: 2 },
    { bound: 5.0, count: 8 },
    { bound: 10.0, count: 12 },
    { bound: 30.0, count: 3 }
  ]
);

// Get the metrics as OTEL-compatible data
const metricsData = metrics.flush();
```

## Core Concepts

### Resources
A **Resource** identifies *what* is producing the telemetry data:
```typescript
import { createResource } from './src/index.js';

const resource = createResource({
  'service.name': 'minecraft-turtle',
  'service.version': '1.0.0',
  'turtle.id': 'turtle-001',
  'location.world': 'overworld'
});
```

### Scopes
A **Scope** (formerly Instrumentation Scope) identifies *which part of your code* is creating the data:
```typescript
import { createInstrumentationScope } from './src/index.js';

const scope = createInstrumentationScope(
  'minecraft.turtle.mining', // name
  '1.0.0' // version
);
```

### Attributes
**Attributes** are key-value pairs that provide context:
```typescript
import { createAttributes } from './src/index.js';

const attributes = createAttributes({
  'block.type': 'minecraft:stone',
  'location.x': 100,
  'location.y': 64,
  'tool.durability': 1500
});
```

## Metric Types

### Counter
A counter only goes up (like Prometheus counter):
```typescript
// Total blocks mined - always increasing
metrics.addCounter('blocks_mined_total', 'Total blocks mined', 'blocks', 150);
```

### Gauge  
A gauge can go up or down (like Prometheus gauge):
```typescript
// Current fuel level - can increase or decrease
metrics.addGauge('fuel_level', 'Current fuel level', 'units', 1200);
```

### Histogram
A histogram shows the distribution of values:
```typescript
// Mining operation durations
metrics.addHistogram(
  'mining_duration',
  'Time to mine blocks', 
  'seconds',
  25,    // total count
  125.5, // sum of all values
  [      // buckets: { bound: upper_limit, count: observations_in_bucket }
    { bound: 1.0, count: 2 },   // 2 operations took ≤1s
    { bound: 5.0, count: 8 },   // 8 operations took ≤5s  
    { bound: 10.0, count: 12 }, // 12 operations took ≤10s
    { bound: 30.0, count: 3 }   // 3 operations took ≤30s
  ]
);
```

## Advanced Usage

### Working with Raw Types

For more control, you can work directly with the underlying types:

```typescript
import {
  createLogRecord,
  createNumberDataPoint,
  createGauge,
  SeverityNumber
} from './src/index.js';

// Create a log record manually
const logRecord = createLogRecord({
  body: 'Custom message',
  severity: SeverityNumber.ERROR,
  attributes: { 'error.code': 'FUEL_EMPTY' }
});

// Create a metric manually  
const dataPoint = createNumberDataPoint(42, { 'location.x': 100 });
const gauge = createGauge('custom_metric', 'Description', 'units', [dataPoint]);
```

### Time Handling

All timestamps are in nanoseconds since Unix epoch:

```typescript
import { getCurrentTimeNanos, msToNanos } from './src/index.js';

const now = getCurrentTimeNanos();
const customTime = msToNanos(Date.now());
```

## File Structure

```
src/
├── types/           # TypeScript type definitions
│   ├── common.ts    # Shared types (AnyValue, KeyValue, etc.)
│   ├── logs.ts      # Log-specific types
│   └── metrics.ts   # Metrics-specific types
├── helpers/         # Helper functions
│   ├── common.ts    # Shared utilities
│   ├── logs.ts      # Log creation helpers
│   └── metrics.ts   # Metrics creation helpers
├── examples/        # Usage examples
│   └── basic-usage.ts
└── index.ts         # Main export file
```

## ComputerCraft Integration

This library is designed to work well with ComputerCraft's constraints:

- **No external dependencies** - works in isolated environments
- **Lightweight** - minimal memory footprint
- **Structured data** - easy to serialize for network transmission
- **Batch-friendly** - collect data over time, then send when network is available

Example ComputerCraft usage:
```lua
-- In your ComputerCraft program, you might do:
local metrics = require("otel-metrics")
local logger = require("otel-logger")

-- Collect data during operation
logger.info("Mining started", {location = {x=100, y=64, z=200}})
metrics.counter("blocks_mined", 1, {block_type = "stone"})

-- Later, when you have network access:
local data = {
  logs = logger.flush(),
  metrics = metrics.flush()
}
rednet.send(server_id, data)
```

## TypeScript Configuration

Make sure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Contributing

This library focuses on being lightweight and dependency-free. When contributing:

1. Keep it simple - avoid complex abstractions
2. No external dependencies
3. Maintain TypeScript strict mode compatibility
4. Add examples for new features

## License

MIT License - see LICENSE file for details.

## Rednet Architecture (ComputerCraft)

For ComputerCraft environments, this library provides a specialized architecture where turtle clients send both metrics and logs immediately over Rednet to a central collector, which handles batching and external API communication.

### Architecture Overview

```
[Turtle 1] ──┐
[Turtle 2] ──┤ Rednet (instant) ──> [Central Collector] ──> [OTLP Metrics & Logs/Grafana]
[Turtle 3] ──┘
```

### Client Side (Turtles)

Turtles use `RednetClient` to send both metrics and logs immediately:

```typescript
import { RednetClient, RednetInstrumentClient } from './helpers/rednet-client.js';

// Create unified client pointing to collector (computer ID 1)
const client = new RednetClient(
  1, // collector computer ID
  'minecraft-turtle',
  '1.0.0',
  {
    'turtle.id': 'turtle-001',
    'turtle.type': 'mining'
  }
);

// Send logs immediately
client.info('Mining operation started', {
  'operation.type': 'strip_mine',
  'location.x': 100
});

client.warn('Low fuel warning', {
  'fuel.current': 200,
  'fuel.threshold': 500
});

// Send metrics immediately
client.sendCounter('blocks_mined_total', 'Total blocks mined', 'blocks', 1, {
  'block.type': 'stone'
});

client.sendGauge('fuel_level', 'Current fuel level', 'units', 1950);

// Instrument approach - create instruments that send immediately
const instruments = new RednetInstrumentClient(client);
const blocksCounter = instruments.createCounter('blocks_mined_total');
const fuelGauge = instruments.createGauge('fuel_level');

// These send immediately to collector
blocksCounter.add(1, { 'block.type': 'stone' });
fuelGauge.set(1950);
```

### Collector Side (Central Server)

The collector receives both metrics and logs and batches them for external APIs:

```typescript
import { RednetCollector } from './helpers/rednet-collector.js';

const collector = new RednetCollector({
  batchInterval: 30000, // 30 seconds
  maxBatchSize: 1000,
  otlpMetricsEndpoint: 'http://grafana:4318/v1/metrics',
  otlpLogsEndpoint: 'http://grafana:4318/v1/logs',
  otlpHeaders: {
    'Authorization': 'Bearer your-api-key'
  }
});

collector.start();

// In ComputerCraft, this would be in your main loop:
while (true) {
  // Listen for telemetry (both metrics and logs)
  const [senderId, message, protocol] = rednet.receive('otel_telemetry', 1);
  if (senderId && message) {
    collector.processTelemetry(message);
  }
  
  // Process batches periodically
  collector.tick();
  
  sleep(0.1);
}
```

### Benefits of This Architecture

1. **Unified Telemetry**: Single client handles both metrics and logs
2. **Instant Transmission**: No client-side batching delays
3. **Centralized Aggregation**: Single point for deduplication and batching
4. **Simplified Clients**: Turtles just fire-and-forget telemetry
5. **Efficient Batching**: Collector optimizes external API calls
6. **Separate Endpoints**: Metrics and logs can go to different destinations
7. **Fault Tolerance**: If collector is down, clients continue working
8. **Resource Efficiency**: Only one computer handles external HTTP calls

### ComputerCraft Implementation

```lua
-- turtle_telemetry.lua (on each turtle)
local client = RednetClient.new(1, "minecraft-turtle", "1.0.0", {
  ["turtle.id"] = tostring(os.getComputerID()),
  ["turtle.type"] = "mining"
})

local instruments = RednetInstrumentClient.new(client)
local blocksCounter = instruments:createCounter("blocks_mined_total")
local fuelGauge = instruments:createGauge("fuel_level")

-- Mining loop
while true do
  if turtle.dig() then
    blocksCounter:add(1, {["block.type"] = "stone"})
    client:debug("Block mined", {["block.type"] = "stone"})
  end
  
  local fuelLevel = turtle.getFuelLevel()
  fuelGauge:set(fuelLevel)
  
  if fuelLevel < 100 then
    client:warn("Low fuel warning", {
      ["fuel.current"] = fuelLevel,
      ["fuel.threshold"] = 100
    })
  end
  
  sleep(1)
end
```

```lua
-- collector.lua (on central computer)
local collector = RednetCollector.new({
  batchInterval = 30000,
  maxBatchSize = 1000,
  otlpMetricsEndpoint = "http://grafana:4318/v1/metrics",
  otlpLogsEndpoint = "http://grafana:4318/v1/logs"
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
```
