/**
 * 📊 OpenTelemetry Metrics Types
 *
 * Comprehensive type definitions for metrics in OpenTelemetry. These types provide
 * standardized representations for counters, gauges, histograms, and other metric
 * types. Perfect for building robust monitoring and observability systems in your
 * ComputerCraft applications! 📈🎯
 *
 * @module otel/types/metrics
 */

// OpenTelemetry Metrics Types
// Based on opentelemetry/proto/metrics/v1/metrics.proto

import { EmptyJsonArray, Nanos } from "../helpers/common";
import { KeyValue, InstrumentationScope, Resource } from "./common";

/**
 * 📦 MetricsData represents the metrics data that can be stored or transferred.
 *
 * This is the top-level container for all metric data in OpenTelemetry.
 * It organizes metrics by resource and instrumentation scope for efficient
 * processing and analysis.
 *
 * @example
 * ```typescript
 * const metricsData: MetricsData = {
 *   resourceMetrics: [
 *     {
 *       resource: {
 *         attributes: [
 *           { key: "service.name", value: { stringValue: "turtle-fleet" } },
 *           { key: "turtle.id", value: { intValue: 42 } }
 *         ],
 *         droppedAttributesCount: 0
 *       },
 *       scopeMetrics: [
 *         {
 *           scope: {
 *             name: "mining-operations",
 *             version: "1.0.0",
 *             attributes: [],
 *             droppedAttributesCount: 0
 *           },
 *           metrics: [
 *             // ... metric definitions
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
export interface MetricsData {
  /** Array of resource metrics, each containing metrics from a specific resource */
  resourceMetrics: ResourceMetrics[];
}

/**
 * 🏷️ A collection of ScopeMetrics from a Resource.
 *
 * Groups all metrics from a specific resource (like a turtle, computer, or service).
 * This allows for efficient organization and attribution of metric data.
 *
 * @example
 * ```typescript
 * const turtleResourceMetrics: ResourceMetrics = {
 *   resource: {
 *     attributes: [
 *       { key: "service.name", value: { stringValue: "turtle-42" } },
 *       { key: "turtle.type", value: { stringValue: "mining" } },
 *       { key: "location.world", value: { stringValue: "overworld" } }
 *     ],
 *     droppedAttributesCount: 0
 *   },
 *   scopeMetrics: [
 *     // Different scopes for different subsystems
 *     // e.g., mining-operations, navigation, inventory-management
 *   ],
 *   schemaUrl: "https://example.com/turtle-schema/v1"
 * };
 * ```
 */
export interface ResourceMetrics {
  /** The resource that produced these metrics */
  resource: Resource;
  /** Array of scope metrics from this resource */
  scopeMetrics: ScopeMetrics[];
  /** URL to the schema defining the structure of this data */
  schemaUrl: string;
}

/**
 * 🔬 A collection of Metrics produced by a Scope.
 *
 * Groups metrics by instrumentation scope (like a specific library or module).
 * This helps organize metrics by their source within a service.
 *
 * @example
 * ```typescript
 * const miningOperationsMetrics: ScopeMetrics = {
 *   scope: {
 *     name: "mining-operations",
 *     version: "2.1.0",
 *     attributes: [
 *       { key: "module.type", value: { stringValue: "core" } }
 *     ],
 *     droppedAttributesCount: 0
 *   },
 *   metrics: [
 *     {
 *       name: "blocks_mined_total",
 *       description: "Total number of blocks mined",
 *       unit: "blocks",
 *       sum: {
 *         dataPoints: [
 *           {
 *             attributes: [
 *               { key: "block.type", value: { stringValue: "minecraft:diamond_ore" } }
 *             ],
 *             startTimeUnixNano: "1640995200000000000",
 *             timeUnixNano: "1640995260000000000",
 *             asInt: 42,
 *             exemplars: [],
 *             flags: 0
 *           }
 *         ],
 *         aggregationTemporality: AggregationTemporality.CUMULATIVE,
 *         isMonotonic: true
 *       },
 *       metadata: []
 *     }
 *   ],
 *   schemaUrl: ""
 * };
 * ```
 */
export interface ScopeMetrics {
  /** The instrumentation scope that produced these metrics */
  scope: InstrumentationScope;
  /** Array of metrics from this scope */
  metrics: Metric[];
  /** URL to the schema defining the structure of this data */
  schemaUrl: string;
}

/**
 * ⏱️ AggregationTemporality defines how a metric aggregator reports aggregated values.
 *
 * This determines whether metric values are cumulative (total since start) or
 * delta (change since last report). Critical for proper metric interpretation!
 *
 * @example
 * ```typescript
 * // Cumulative counter - reports total since start
 * const cumulativeCounter = {
 *   aggregationTemporality: AggregationTemporality.CUMULATIVE,
 *   // Value: 100 (total blocks mined since turtle started)
 * };
 *
 * // Delta counter - reports change since last report
 * const deltaCounter = {
 *   aggregationTemporality: AggregationTemporality.DELTA,
 *   // Value: 5 (blocks mined in the last minute)
 * };
 * ```
 */
export enum AggregationTemporality {
  /** Unspecified temporality */
  UNSPECIFIED = 0,
  /** Delta temporality - values represent changes since last report */
  DELTA = 1,
  /** Cumulative temporality - values represent totals since start */
  CUMULATIVE = 2,
}

/**
 * 🚩 DataPointFlags is used as a bit-field representing distinct boolean flags.
 *
 * Provides additional metadata about data points, such as whether a value
 * was actually recorded or if it represents a missing measurement.
 *
 * @example
 * ```typescript
 * // Check if a data point has a recorded value
 * const hasValue = (dataPoint.flags & DataPointFlags.NO_RECORDED_VALUE_MASK) === 0;
 *
 * // Set flag for missing value
 * const flagsWithMissingValue = DataPointFlags.NO_RECORDED_VALUE_MASK;
 * ```
 */
export enum DataPointFlags {
  /** Default value - do not use */
  DO_NOT_USE = 0,
  /** Indicates no value was recorded for this data point */
  NO_RECORDED_VALUE_MASK = 1,
}

/**
 * 📊 Defines a Metric which has one or more timeseries.
 *
 * The core metric definition that includes metadata and the actual metric data.
 * This is a discriminated union that can contain different types of metric data.
 *
 * @example
 * ```typescript
 * // Counter metric
 * const blocksMinedMetric: Metric = {
 *   name: "blocks_mined_total",
 *   description: "Total blocks mined by this turtle",
 *   unit: "blocks",
 *   sum: {
 *     dataPoints: [
 *       {
 *         attributes: [
 *           { key: "block.type", value: { stringValue: "minecraft:diamond_ore" } }
 *         ],
 *         startTimeUnixNano: "1640995200000000000",
 *         timeUnixNano: "1640995260000000000",
 *         asInt: 42,
 *         exemplars: [],
 *         flags: 0
 *       }
 *     ],
 *     aggregationTemporality: AggregationTemporality.CUMULATIVE,
 *     isMonotonic: true
 *   },
 *   metadata: []
 * };
 *
 * // Gauge metric
 * const fuelLevelMetric: Metric = {
 *   name: "fuel_level",
 *   description: "Current fuel level",
 *   unit: "units",
 *   gauge: {
 *     dataPoints: [
 *       {
 *         attributes: [],
 *         startTimeUnixNano: "1640995200000000000",
 *         timeUnixNano: "1640995260000000000",
 *         asInt: 15000,
 *         exemplars: [],
 *         flags: 0
 *       }
 *     ]
 *   },
 *   metadata: []
 * };
 * ```
 */
export type Metric = {
  /** Unique name for this metric */
  name: string;
  /** Human-readable description of what this metric measures */
  description: string;
  /** Unit of measurement (e.g., "bytes", "seconds", "requests") */
  unit: string;
  /** Additional metadata about this metric */
  metadata: KeyValue[] | EmptyJsonArray;
} & MetricData;

/**
 * 🎯 Union type for different metric data types.
 *
 * This discriminated union allows a metric to contain exactly one type of data:
 * gauge, sum (counter), histogram, exponential histogram, or summary.
 */
export type MetricData =
  | { gauge: Gauge }
  | { sum: Sum }
  | { histogram: Histogram }
  | { exponentialHistogram: ExponentialHistogram }
  | { summary: Summary };

/**
 * 📊 Gauge represents a scalar metric that always exports the "current value".
 *
 * Gauges are perfect for values that can go up or down, like fuel levels,
 * temperature, or queue sizes. They represent the current state at the time
 * of measurement.
 *
 * @example
 * ```typescript
 * const temperatureGauge: Gauge = {
 *   dataPoints: [
 *     {
 *       attributes: [
 *         { key: "sensor.location", value: { stringValue: "reactor_core" } }
 *       ],
 *       startTimeUnixNano: "1640995200000000000",
 *       timeUnixNano: "1640995260000000000",
 *       asDouble: 85.5,
 *       exemplars: [],
 *       flags: 0
 *     }
 *   ]
 * };
 * ```
 */
export interface Gauge {
  /** Array of data points for this gauge */
  dataPoints: NumberDataPoint[];
}

/**
 * 📈 Sum represents a scalar metric calculated as a sum of all reported measurements.
 *
 * Sums are perfect for counters and cumulative values. They can be monotonic
 * (only increasing) or non-monotonic (can increase or decrease).
 *
 * @example
 * ```typescript
 * const requestsSum: Sum = {
 *   dataPoints: [
 *     {
 *       attributes: [
 *         { key: "method", value: { stringValue: "GET" } },
 *         { key: "status", value: { stringValue: "200" } }
 *       ],
 *       startTimeUnixNano: "1640995200000000000",
 *       timeUnixNano: "1640995260000000000",
 *       asInt: 1542,
 *       exemplars: [],
 *       flags: 0
 *     }
 *   ],
 *   aggregationTemporality: AggregationTemporality.CUMULATIVE,
 *   isMonotonic: true
 * };
 * ```
 */
export interface Sum {
  /** Array of data points for this sum */
  dataPoints: NumberDataPoint[];
  /** How the aggregation is performed over time */
  aggregationTemporality: AggregationTemporality;
  /** Whether this sum only increases (true for counters) */
  isMonotonic: boolean;
}

/**
 * 📊 Histogram represents a metric calculated by aggregating as a Histogram.
 *
 * Histograms are perfect for tracking distributions of values like request
 * durations, file sizes, or operation timing. They provide count, sum, and
 * bucket information for statistical analysis.
 *
 * @example
 * ```typescript
 * const requestDurationHistogram: Histogram = {
 *   dataPoints: [
 *     {
 *       attributes: [
 *         { key: "endpoint", value: { stringValue: "/api/mine" } }
 *       ],
 *       startTimeUnixNano: "1640995200000000000",
 *       timeUnixNano: "1640995260000000000",
 *       count: 100,
 *       sum: 1250.5,
 *       bucketCounts: [10, 25, 40, 20, 5],
 *       explicitBounds: [0.1, 0.5, 1.0, 2.0],
 *       exemplars: [],
 *       flags: 0,
 *       min: 0.05,
 *       max: 3.2
 *     }
 *   ],
 *   aggregationTemporality: AggregationTemporality.CUMULATIVE
 * };
 * ```
 */
export interface Histogram {
  /** Array of histogram data points */
  dataPoints: HistogramDataPoint[];
  /** How the aggregation is performed over time */
  aggregationTemporality: AggregationTemporality;
}

/**
 * 📊 ExponentialHistogram represents a metric calculated by aggregating as an ExponentialHistogram.
 *
 * Exponential histograms provide more efficient storage for wide value ranges
 * by using exponentially-sized buckets. Great for metrics with large dynamic ranges.
 *
 * @example
 * ```typescript
 * const memoryUsageExpHistogram: ExponentialHistogram = {
 *   dataPoints: [
 *     {
 *       attributes: [
 *         { key: "process.type", value: { stringValue: "turtle" } }
 *       ],
 *       startTimeUnixNano: "1640995200000000000",
 *       timeUnixNano: "1640995260000000000",
 *       count: 1000,
 *       sum: 524288000,
 *       scale: 2,
 *       zeroCount: 5,
 *       positive: {
 *         offset: 0,
 *         bucketCounts: [10, 20, 30, 25, 15]
 *       },
 *       negative: {
 *         offset: 0,
 *         bucketCounts: []
 *       },
 *       flags: 0,
 *       exemplars: [],
 *       zeroThreshold: 0.001
 *     }
 *   ],
 *   aggregationTemporality: AggregationTemporality.CUMULATIVE
 * };
 * ```
 */
export interface ExponentialHistogram {
  /** Array of exponential histogram data points */
  dataPoints: ExponentialHistogramDataPoint[];
  /** How the aggregation is performed over time */
  aggregationTemporality: AggregationTemporality;
}

/**
 * 📊 Summary metric data convey quantile summaries.
 *
 * Summaries provide quantile information (like median, 95th percentile) for
 * a distribution of values. Useful for understanding performance characteristics.
 *
 * @example
 * ```typescript
 * const responseTimeSummary: Summary = {
 *   dataPoints: [
 *     {
 *       attributes: [
 *         { key: "service", value: { stringValue: "api" } }
 *       ],
 *       startTimeUnixNano: "1640995200000000000",
 *       timeUnixNano: "1640995260000000000",
 *       count: 1000,
 *       sum: 1250.5,
 *       quantileValues: [
 *         { quantile: 0.5, value: 1.2 },   // median
 *         { quantile: 0.95, value: 2.8 },  // 95th percentile
 *         { quantile: 0.99, value: 4.1 }   // 99th percentile
 *       ],
 *       flags: 0
 *     }
 *   ]
 * };
 * ```
 */
export interface Summary {
  /** Array of summary data points */
  dataPoints: SummaryDataPoint[];
}

/**
 * 🔢 NumberDataPoint is a single data point in a timeseries for scalar values.
 *
 * Used by gauges and sums to represent individual measurements with timestamps
 * and attributes. Can contain either integer or floating-point values.
 *
 * @example
 * ```typescript
 * const fuelLevelDataPoint: NumberDataPoint = {
 *   attributes: [
 *     { key: "turtle.id", value: { intValue: 42 } },
 *     { key: "fuel.type", value: { stringValue: "coal" } }
 *   ],
 *   startTimeUnixNano: "1640995200000000000",
 *   timeUnixNano: "1640995260000000000",
 *   asInt: 15000,
 *   exemplars: [],
 *   flags: 0
 * };
 * ```
 */
export type NumberDataPoint = {
  /** Attributes for this specific data point */
  attributes: KeyValue[];
  /** Start time for this measurement period (nanoseconds since Unix epoch) */
  startTimeUnixNano: Nanos;
  /** Timestamp of this measurement (nanoseconds since Unix epoch) */
  timeUnixNano: Nanos;
  /** Example values that led to this data point */
  exemplars: Exemplar[] | EmptyJsonArray;
  /** Additional flags for this data point */
  flags: number;
} & (
  | {
      /** Integer value */
      asInt: number;
    }
  | {
      /** Floating-point value */
      asDouble: number;
    }
);

/**
 * 📊 HistogramDataPoint describes time-varying values of a Histogram.
 *
 * Contains all the information needed to represent a histogram: count, sum,
 * bucket counts, and bucket boundaries. Essential for understanding distributions.
 *
 * @example
 * ```typescript
 * const miningDurationHistogramPoint: HistogramDataPoint = {
 *   attributes: [
 *     { key: "block.type", value: { stringValue: "minecraft:stone" } }
 *   ],
 *   startTimeUnixNano: "1640995200000000000",
 *   timeUnixNano: "1640995260000000000",
 *   count: 100,
 *   sum: 250.5,
 *   bucketCounts: [20, 30, 35, 15],  // counts in each bucket
 *   explicitBounds: [0.1, 0.5, 1.0], // bucket boundaries
 *   exemplars: [],
 *   flags: 0,
 *   min: 0.05,
 *   max: 1.8
 * };
 * ```
 */
export interface HistogramDataPoint {
  /** Attributes for this specific data point */
  attributes: KeyValue[];
  /** Start time for this measurement period (nanoseconds since Unix epoch) */
  startTimeUnixNano: Nanos;
  /** Timestamp of this measurement (nanoseconds since Unix epoch) */
  timeUnixNano: Nanos;
  /** Total number of observations */
  count: number;
  /** Sum of all observed values (optional) */
  sum?: number;
  /** Count of observations in each bucket */
  bucketCounts: number[];
  /** Upper bounds of histogram buckets */
  explicitBounds: number[];
  /** Example values that led to this data point */
  exemplars: Exemplar[] | EmptyJsonArray;
  /** Additional flags for this data point */
  flags: number;
  /** Minimum observed value (optional) */
  min?: number;
  /** Maximum observed value (optional) */
  max?: number;
}

/**
 * 📊 ExponentialHistogramDataPoint describes time-varying values of an ExponentialHistogram.
 *
 * More complex than regular histograms, these use exponentially-sized buckets
 * for efficient representation of wide value ranges.
 *
 * @example
 * ```typescript
 * const memoryUsageExpHistogramPoint: ExponentialHistogramDataPoint = {
 *   attributes: [
 *     { key: "process.name", value: { stringValue: "turtle-miner" } }
 *   ],
 *   startTimeUnixNano: "1640995200000000000",
 *   timeUnixNano: "1640995260000000000",
 *   count: 1000,
 *   sum: 524288000,
 *   scale: 2,
 *   zeroCount: 5,
 *   positive: {
 *     offset: 0,
 *     bucketCounts: [10, 20, 30, 25, 15]
 *   },
 *   negative: {
 *     offset: 0,
 *     bucketCounts: []
 *   },
 *   flags: 0,
 *   exemplars: [],
 *   zeroThreshold: 0.001
 * };
 * ```
 */
export interface ExponentialHistogramDataPoint {
  /** Attributes for this specific data point */
  attributes: KeyValue[];
  /** Start time for this measurement period (nanoseconds since Unix epoch) */
  startTimeUnixNano: Nanos;
  /** Timestamp of this measurement (nanoseconds since Unix epoch) */
  timeUnixNano: Nanos;
  /** Total number of observations */
  count: number;
  /** Sum of all observed values (optional) */
  sum?: number;
  /** Scale factor for bucket boundaries */
  scale: number;
  /** Count of observations that are exactly zero */
  zeroCount: number;
  /** Positive value buckets */
  positive: Buckets;
  /** Negative value buckets */
  negative: Buckets;
  /** Additional flags for this data point */
  flags: number;
  /** Example values that led to this data point */
  exemplars: Exemplar[];
  /** Minimum observed value (optional) */
  min?: number;
  /** Maximum observed value (optional) */
  max?: number;
  /** Threshold for considering values as zero */
  zeroThreshold: number;
}

/**
 * 🪣 Buckets are a set of bucket counts for exponential histograms.
 *
 * Represents the bucket structure for exponential histograms, with an offset
 * and counts for each bucket.
 *
 * @example
 * ```typescript
 * const positiveBuckets: Buckets = {
 *   offset: 0,
 *   bucketCounts: [10, 20, 30, 25, 15, 5]
 * };
 * ```
 */
export interface Buckets {
  /** Offset for the first bucket */
  offset: number;
  /** Count of observations in each bucket */
  bucketCounts: number[];
}

/**
 * 📊 SummaryDataPoint describes time-varying values of a Summary metric.
 *
 * Contains quantile information for understanding the distribution of values.
 * Useful for performance analysis and SLA monitoring.
 *
 * @example
 * ```typescript
 * const apiResponseTimeSummary: SummaryDataPoint = {
 *   attributes: [
 *     { key: "endpoint", value: { stringValue: "/api/turtle/status" } }
 *   ],
 *   startTimeUnixNano: "1640995200000000000",
 *   timeUnixNano: "1640995260000000000",
 *   count: 1000,
 *   sum: 1250.5,
 *   quantileValues: [
 *     { quantile: 0.5, value: 1.2 },   // 50th percentile (median)
 *     { quantile: 0.95, value: 2.8 },  // 95th percentile
 *     { quantile: 0.99, value: 4.1 }   // 99th percentile
 *   ],
 *   flags: 0
 * };
 * ```
 */
export interface SummaryDataPoint {
  /** Attributes for this specific data point */
  attributes: KeyValue[];
  /** Start time for this measurement period (nanoseconds since Unix epoch) */
  startTimeUnixNano: Nanos;
  /** Timestamp of this measurement (nanoseconds since Unix epoch) */
  timeUnixNano: Nanos;
  /** Total number of observations */
  count: number;
  /** Sum of all observed values */
  sum: number;
  /** Quantile values for this summary */
  quantileValues: ValueAtQuantile[];
  /** Additional flags for this data point */
  flags: number;
}

/**
 * 📊 ValueAtQuantile represents the value at a given quantile of a distribution.
 *
 * Used in summary metrics to represent percentiles and other quantiles.
 * Essential for understanding performance characteristics and SLAs.
 *
 * @example
 * ```typescript
 * const quantiles: ValueAtQuantile[] = [
 *   { quantile: 0.5, value: 1.2 },   // median response time: 1.2s
 *   { quantile: 0.95, value: 2.8 },  // 95% of requests under 2.8s
 *   { quantile: 0.99, value: 4.1 }   // 99% of requests under 4.1s
 * ];
 * ```
 */
export interface ValueAtQuantile {
  /** The quantile (must be between 0.0 and 1.0) */
  quantile: number;
  /** The value at this quantile */
  value: number;
}

/**
 * 🎯 Exemplar is a sample input measurement with environment information.
 *
 * Exemplars provide specific examples of measurements that contributed to
 * aggregated metrics. They help with debugging and understanding metric values.
 *
 * @example
 * ```typescript
 * const slowRequestExemplar: Exemplar = {
 *   filteredAttributes: [
 *     { key: "trace.id", value: { stringValue: "abc123def456" } },
 *     { key: "user.id", value: { stringValue: "user_789" } }
 *   ],
 *   timeUnixNano: "1640995230000000000",
 *   asDouble: 5.2,  // This specific request took 5.2 seconds
 *   spanId: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
 *   traceId: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
 * };
 * ```
 */
export type Exemplar = {
  /** Additional attributes for this exemplar */
  filteredAttributes: KeyValue[];
  /** Timestamp of this exemplar (nanoseconds since Unix epoch) */
  timeUnixNano: Nanos;
  /** Optional span ID for trace correlation */
  spanId?: Uint8Array;
  /** Optional trace ID for trace correlation */
  traceId?: Uint8Array;
} & (
  | {
      /** Integer exemplar value */
      asInt: number;
    }
  | {
      /** Floating-point exemplar value */
      asDouble: number;
    }
);
