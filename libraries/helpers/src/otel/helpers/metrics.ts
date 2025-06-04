// Helper functions for OpenTelemetry metrics

import {
  MetricsData,
  ResourceMetrics,
  ScopeMetrics,
  Metric,
  MetricData,
  NumberDataPoint,
  HistogramDataPoint,
  AggregationTemporality,
  Gauge,
  Sum,
  Histogram,
} from "../types/metrics";
import { Resource, InstrumentationScope } from "../types/common";
import {
  createAttributes,
  getCurrentTimeNanos,
  createResource,
  createInstrumentationScope,
  emptyJsonArray,
  msToNanos,
} from "./common";

/**
 * Create a NumberDataPoint for gauge and sum metrics.
 */
export function createNumberDataPoint(
  value: number,
  attributes: Record<string, unknown> = {},
  timestamp?: number,
  startTime?: number
): NumberDataPoint {
  const now = timestamp ? msToNanos(timestamp) : getCurrentTimeNanos();
  const start = startTime ? msToNanos(startTime) : now;

  return {
    attributes: createAttributes(attributes),
    startTimeUnixNano: start,
    timeUnixNano: now,
    asDouble: value,
    exemplars: emptyJsonArray,
    flags: 0,
  };
}

/**
 * Create a HistogramDataPoint.
 */
export function createHistogramDataPoint(
  count: number,
  sum: number,
  bucketCounts: number[],
  explicitBounds: number[],
  attributes: Record<string, unknown> = {},
  timestamp?: number,
  startTime?: number
): HistogramDataPoint {
  const now = timestamp ? msToNanos(timestamp) : getCurrentTimeNanos();
  const start = startTime ? msToNanos(startTime) : now;

  return {
    attributes: createAttributes(attributes),
    startTimeUnixNano: start,
    timeUnixNano: now,
    count,
    sum,
    bucketCounts,
    explicitBounds,
    exemplars: emptyJsonArray,
    flags: 0,
  };
}

/**
 * Create a Gauge metric.
 */
export function createGauge(
  name: string,
  description: string,
  unit: string,
  dataPoints: NumberDataPoint[]
): Metric {
  return {
    name,
    description,
    unit,
    gauge: {
      dataPoints,
    },
    metadata: emptyJsonArray,
  };
}

/**
 * Create a Sum metric.
 */
export function createSum(
  name: string,
  description: string,
  unit: string,
  dataPoints: NumberDataPoint[],
  isMonotonic: boolean = true,
  aggregationTemporality: AggregationTemporality = AggregationTemporality.CUMULATIVE
): Metric {
  return {
    name,
    description,
    unit,
    sum: {
      dataPoints,
      aggregationTemporality,
      isMonotonic,
    },
    metadata: emptyJsonArray,
  };
}

/**
 * Create a Histogram metric.
 */
export function createHistogram(
  name: string,
  description: string,
  unit: string,
  dataPoints: HistogramDataPoint[],
  aggregationTemporality: AggregationTemporality = AggregationTemporality.CUMULATIVE
): Metric {
  return {
    name,
    description,
    unit,
    histogram: {
      dataPoints,
      aggregationTemporality,
    },
    metadata: emptyJsonArray,
  };
}

/**
 * Create ScopeMetrics with metrics from a specific scope.
 */
export function createScopeMetrics(
  scope: InstrumentationScope,
  metrics: Metric[],
  schemaUrl: string = ""
): ScopeMetrics {
  return {
    scope,
    metrics,
    schemaUrl,
  };
}

/**
 * Create ResourceMetrics with metrics from a specific resource.
 */
export function createResourceMetrics(
  resource: Resource,
  scopeMetrics: ScopeMetrics[],
  schemaUrl: string = ""
): ResourceMetrics {
  return {
    resource,
    scopeMetrics,
    schemaUrl,
  };
}

/**
 * Create a complete MetricsData structure.
 */
export function createMetricsData(
  resourceMetrics: ResourceMetrics[]
): MetricsData {
  return {
    resourceMetrics,
  };
}

/**
 * Simple metrics collector class for creating and managing metrics.
 */
export class SimpleMetricsCollector {
  private resource: Resource;
  private scope: InstrumentationScope;
  private metrics: Metric[] = [];

  constructor(
    serviceName: string,
    serviceVersion: string = "1.0.0",
    resourceAttributes: Record<string, unknown> = {}
  ) {
    this.resource = createResource({
      "service.name": serviceName,
      "service.version": serviceVersion,
    });

    this.scope = createInstrumentationScope(
      serviceName,
      serviceVersion,
      resourceAttributes
    );
  }

  /**
   * Add a gauge metric (current value).
   */
  addGauge(
    name: string,
    description: string,
    unit: string,
    value: number,
    attributes: Record<string, unknown> = {}
  ): void {
    const dataPoint = createNumberDataPoint(value, attributes);
    const metric = createGauge(name, description, unit, [dataPoint]);
    this.metrics.push(metric);
  }

  /**
   * Add a counter metric (monotonic sum).
   */
  addCounter(
    name: string,
    description: string,
    unit: string,
    value: number,
    attributes: Record<string, unknown> = {}
  ): void {
    const dataPoint = createNumberDataPoint(value, attributes);
    const metric = createSum(name, description, unit, [dataPoint], true);
    this.metrics.push(metric);
  }

  /**
   * Add a histogram metric.
   */
  addHistogram(
    name: string,
    description: string,
    unit: string,
    count: number,
    sum: number,
    buckets: { bound: number; count: number }[],
    attributes: Record<string, unknown> = {}
  ): void {
    // Sort buckets by bound and extract bounds and counts
    const sortedBuckets = buckets.sort((a, b) => a.bound - b.bound);
    const explicitBounds = sortedBuckets.map((b) => b.bound);
    const bucketCounts = sortedBuckets.map((b) => b.count);

    // Add infinity bucket count (total count - sum of all bucket counts)
    const sumBucketCounts = bucketCounts.reduce((sum, count) => sum + count, 0);
    bucketCounts.push(count - sumBucketCounts);

    const dataPoint = createHistogramDataPoint(
      count,
      sum,
      bucketCounts,
      explicitBounds,
      attributes
    );

    const metric = createHistogram(name, description, unit, [dataPoint]);
    this.metrics.push(metric);
  }

  /**
   * Get all metrics and clear the buffer.
   */
  flush(): MetricsData {
    const scopeMetrics = createScopeMetrics(this.scope, [...this.metrics]);
    const resourceMetrics = createResourceMetrics(this.resource, [
      scopeMetrics,
    ]);
    const metricsData = createMetricsData([resourceMetrics]);

    this.metrics = []; // Clear the buffer
    return metricsData;
  }

  /**
   * Get current metrics without clearing the buffer.
   */
  getMetrics(): MetricsData {
    const scopeMetrics = createScopeMetrics(this.scope, [...this.metrics]);
    const resourceMetrics = createResourceMetrics(this.resource, [
      scopeMetrics,
    ]);
    return createMetricsData([resourceMetrics]);
  }
}

/**
 * Helper for creating standard histogram buckets.
 */
export function createStandardBuckets(): number[] {
  return [
    0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5,
    10.0,
  ];
}

/**
 * Helper for creating exponential histogram buckets.
 */
export function createExponentialBuckets(
  start: number,
  factor: number,
  count: number
): number[] {
  const buckets: number[] = [];
  let current = start;

  for (let i = 0; i < count; i++) {
    buckets.push(current);
    current *= factor;
  }

  return buckets;
}
