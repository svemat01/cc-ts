// Instrument-style API for OpenTelemetry metrics
// Provides a more traditional OTEL experience while still using the snapshot foundation

import { SimpleMetricsCollector } from "./metrics";

/**
 * A counter instrument that tracks cumulative values.
 */
export class CounterInstrument {
  private value: number = 0;
  private collector: SimpleMetricsCollector;
  private name: string;
  private description: string;
  private unit: string;

  constructor(
    collector: SimpleMetricsCollector,
    name: string,
    description: string,
    unit: string = ""
  ) {
    this.collector = collector;
    this.name = name;
    this.description = description;
    this.unit = unit;
  }

  /**
   * Add a value to the counter.
   */
  add(value: number, attributes: Record<string, unknown> = {}): void {
    if (value < 0) {
      throw new Error("Counter values must be non-negative");
    }
    this.value += value;

    // Update the collector with the new total
    this.collector.addCounter(
      this.name,
      this.description,
      this.unit,
      this.value,
      attributes
    );
  }

  /**
   * Get the current value.
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Reset the counter (useful for testing).
   */
  reset(): void {
    this.value = 0;
  }
}

/**
 * A gauge instrument that tracks current values.
 */
export class GaugeInstrument {
  private value: number = 0;
  private collector: SimpleMetricsCollector;
  private name: string;
  private description: string;
  private unit: string;

  constructor(
    collector: SimpleMetricsCollector,
    name: string,
    description: string,
    unit: string = ""
  ) {
    this.collector = collector;
    this.name = name;
    this.description = description;
    this.unit = unit;
  }

  /**
   * Set the gauge to a specific value.
   */
  set(value: number, attributes: Record<string, unknown> = {}): void {
    this.value = value;

    // Update the collector with the new value
    this.collector.addGauge(
      this.name,
      this.description,
      this.unit,
      this.value,
      attributes
    );
  }

  /**
   * Add to the current gauge value.
   */
  add(value: number, attributes: Record<string, unknown> = {}): void {
    this.value += value;
    this.set(this.value, attributes);
  }

  /**
   * Subtract from the current gauge value.
   */
  subtract(value: number, attributes: Record<string, unknown> = {}): void {
    this.value -= value;
    this.set(this.value, attributes);
  }

  /**
   * Get the current value.
   */
  getValue(): number {
    return this.value;
  }
}

/**
 * A histogram instrument that tracks distributions of values.
 */
export class HistogramInstrument {
  private observations: number[] = [];
  private collector: SimpleMetricsCollector;
  private name: string;
  private description: string;
  private unit: string;
  private buckets: number[];

  constructor(
    collector: SimpleMetricsCollector,
    name: string,
    description: string,
    unit: string = "",
    buckets: number[] = [
      0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5,
      10.0,
    ]
  ) {
    this.collector = collector;
    this.name = name;
    this.description = description;
    this.unit = unit;
    this.buckets = buckets.sort((a, b) => a - b);
  }

  /**
   * Record an observation.
   */
  record(value: number, attributes: Record<string, unknown> = {}): void {
    this.observations.push(value);

    // Calculate histogram data
    const count = this.observations.length;
    const sum = this.observations.reduce((a, b) => a + b, 0);

    // Calculate bucket counts
    const bucketData = this.buckets.map((bound) => ({
      bound,
      count: this.observations.filter((obs) => obs <= bound).length,
    }));

    // Update the collector
    this.collector.addHistogram(
      this.name,
      this.description,
      this.unit,
      count,
      sum,
      bucketData,
      attributes
    );
  }

  /**
   * Get current statistics.
   */
  getStats(): {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
  } {
    if (this.observations.length === 0) {
      return { count: 0, sum: 0, min: 0, max: 0, avg: 0 };
    }

    const count = this.observations.length;
    const sum = this.observations.reduce((a, b) => a + b, 0);
    const min = Math.min(...this.observations);
    const max = Math.max(...this.observations);
    const avg = sum / count;

    return { count, sum, min, max, avg };
  }

  /**
   * Clear all observations (useful for testing).
   */
  reset(): void {
    this.observations = [];
  }
}

/**
 * A meter that creates instruments.
 */
export class Meter {
  private collector: SimpleMetricsCollector;
  private instruments: Map<
    string,
    CounterInstrument | GaugeInstrument | HistogramInstrument
  > = new Map();

  constructor(collector: SimpleMetricsCollector) {
    this.collector = collector;
  }

  /**
   * Create a counter instrument.
   */
  createCounter(
    name: string,
    options: {
      description?: string;
      unit?: string;
    } = {}
  ): CounterInstrument {
    const key = `counter:${name}`;
    if (this.instruments.has(key)) {
      return this.instruments.get(key) as CounterInstrument;
    }

    const counter = new CounterInstrument(
      this.collector,
      name,
      options.description || "",
      options.unit || ""
    );

    this.instruments.set(key, counter);
    return counter;
  }

  /**
   * Create a gauge instrument.
   */
  createGauge(
    name: string,
    options: {
      description?: string;
      unit?: string;
    } = {}
  ): GaugeInstrument {
    const key = `gauge:${name}`;
    if (this.instruments.has(key)) {
      return this.instruments.get(key) as GaugeInstrument;
    }

    const gauge = new GaugeInstrument(
      this.collector,
      name,
      options.description || "",
      options.unit || ""
    );

    this.instruments.set(key, gauge);
    return gauge;
  }

  /**
   * Create a histogram instrument.
   */
  createHistogram(
    name: string,
    options: {
      description?: string;
      unit?: string;
      buckets?: number[];
    } = {}
  ): HistogramInstrument {
    const key = `histogram:${name}`;
    if (this.instruments.has(key)) {
      return this.instruments.get(key) as HistogramInstrument;
    }

    const histogram = new HistogramInstrument(
      this.collector,
      name,
      options.description || "",
      options.unit || "",
      options.buckets
    );

    this.instruments.set(key, histogram);
    return histogram;
  }

  /**
   * Get all created instruments.
   */
  getInstruments(): Map<
    string,
    CounterInstrument | GaugeInstrument | HistogramInstrument
  > {
    return new Map(this.instruments);
  }
}
