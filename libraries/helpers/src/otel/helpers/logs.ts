// Helper functions for OpenTelemetry logs

import {
  LogsData,
  ResourceLogs,
  ScopeLogs,
  LogRecord,
  SeverityNumber,
} from "../types/logs";
import { Resource, InstrumentationScope, AnyValue } from "../types/common";
import {
  createAnyValue,
  createAttributes,
  getCurrentTimeNanos,
  createResource,
  createInstrumentationScope,
  msToNanos,
} from "./common";

import * as pretty from "cc.pretty";

/**
 * Create a LogRecord with sensible defaults.
 */
export function createLogRecord(options: {
  body: unknown;
  severity?: SeverityNumber;
  severityText?: string;
  attributes?: Record<string, unknown>;
  timestamp?: number; // milliseconds since epoch
  // traceId?: Uint8Array;
  // spanId?: Uint8Array;
  eventName?: string;
}): LogRecord {
  const now = options.timestamp
    ? msToNanos(options.timestamp)
    : getCurrentTimeNanos();

  return {
    timeUnixNano: now.toString(),
    observedTimeUnixNano: now.toString(),
    severityNumber: options.severity ?? SeverityNumber.INFO,
    severityText:
      options.severityText ??
      getSeverityText(options.severity ?? SeverityNumber.INFO),
    body: createAnyValue(options.body),
    attributes: createAttributes(options.attributes ?? {}),
    droppedAttributesCount: 0,
    flags: 0,
    // traceId: options.traceId ?? new Uint8Array(16),
    // spanId: options.spanId ?? new Uint8Array(8),
    eventName: options.eventName ?? "",
  };
}

/**
 * Get severity text from severity number.
 */
export function getSeverityText(severity: SeverityNumber): string {
  switch (severity) {
    case SeverityNumber.TRACE:
    case SeverityNumber.TRACE2:
    case SeverityNumber.TRACE3:
    case SeverityNumber.TRACE4:
      return "TRACE";
    case SeverityNumber.DEBUG:
    case SeverityNumber.DEBUG2:
    case SeverityNumber.DEBUG3:
    case SeverityNumber.DEBUG4:
      return "DEBUG";
    case SeverityNumber.INFO:
    case SeverityNumber.INFO2:
    case SeverityNumber.INFO3:
    case SeverityNumber.INFO4:
      return "INFO";
    case SeverityNumber.WARN:
    case SeverityNumber.WARN2:
    case SeverityNumber.WARN3:
    case SeverityNumber.WARN4:
      return "WARN";
    case SeverityNumber.ERROR:
    case SeverityNumber.ERROR2:
    case SeverityNumber.ERROR3:
    case SeverityNumber.ERROR4:
      return "ERROR";
    case SeverityNumber.FATAL:
    case SeverityNumber.FATAL2:
    case SeverityNumber.FATAL3:
    case SeverityNumber.FATAL4:
      return "FATAL";
    default:
      return "UNSPECIFIED";
  }
}

export function getSeverityNumberLevel(severity: SeverityNumber): number {
  switch (severity) {
    case SeverityNumber.TRACE:
    case SeverityNumber.TRACE2:
    case SeverityNumber.TRACE3:
    case SeverityNumber.TRACE4:
      return 10;
    case SeverityNumber.DEBUG:
    case SeverityNumber.DEBUG2:
    case SeverityNumber.DEBUG3:
    case SeverityNumber.DEBUG4:
      return 20;
    case SeverityNumber.INFO:
    case SeverityNumber.INFO2:
    case SeverityNumber.INFO3:
    case SeverityNumber.INFO4:
      return 30;
    case SeverityNumber.WARN:
    case SeverityNumber.WARN2:
    case SeverityNumber.WARN3:
    case SeverityNumber.WARN4:
      return 40;
    case SeverityNumber.ERROR:
    case SeverityNumber.ERROR2:
    case SeverityNumber.ERROR3:
    case SeverityNumber.ERROR4:
      return 50;
    case SeverityNumber.FATAL:
    case SeverityNumber.FATAL2:
    case SeverityNumber.FATAL3:
    case SeverityNumber.FATAL4:
      return 60;
    default:
      return 0;
  }
}

/**
 * Create a ScopeLogs with logs from a specific scope.
 */
export function createScopeLogs(
  scope: InstrumentationScope,
  logRecords: LogRecord[],
  schemaUrl: string = ""
): ScopeLogs {
  return {
    scope,
    logRecords,
    schemaUrl,
  };
}

/**
 * Create ResourceLogs with logs from a specific resource.
 */
export function createResourceLogs(
  resource: Resource,
  scopeLogs: ScopeLogs[],
  schemaUrl: string = ""
): ResourceLogs {
  return {
    resource,
    scopeLogs,
    schemaUrl,
  };
}

/**
 * Create a complete LogsData structure.
 */
export function createLogsData(resourceLogs: ResourceLogs[]): LogsData {
  return {
    resourceLogs,
  };
}

/**
 * Simple logger class for creating structured logs.
 */
export class SimpleLogger {
  private resource: Resource;
  private scope: InstrumentationScope;
  private logs: LogRecord[] = [];

  static consoleLog(
    severity: SeverityNumber,
    message: unknown,
    attributes: Record<string, unknown> = {}
  ): void {
    const severityText = getSeverityText(severity);

    // Set color based on severity
    let color;
    switch (severity) {
      case SeverityNumber.TRACE:
        color = colors.gray;
        break;
      case SeverityNumber.DEBUG:
        color = colors.lightGray;
        break;
      case SeverityNumber.INFO:
        color = colors.white;
        break;
      case SeverityNumber.WARN:
        color = colors.yellow;
        break;
      case SeverityNumber.ERROR:
        color = colors.red;
        break;
      case SeverityNumber.FATAL:
        color = colors.red;
        break;
      default:
        color = colors.white;
    }
    pretty.print(
      pretty.group(
        pretty.concat(
          pretty.text(os.date("!%H:%M:%S") as string, colors.lightGray),
          pretty.space,
          "[",
          pretty.text(severityText, color),
          "]",
          pretty.space,
          pretty.text(String(message)),
          pretty.space,
          pretty.pretty(attributes)
        )
      )
    );
  }

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
   * Add a log record.
   */
  log(
    severity: SeverityNumber,
    message: unknown,
    attributes: Record<string, unknown> = {}
  ): void {
    const logRecord = createLogRecord({
      body: message,
      severity,
      attributes,
    });

    this.logs.push(logRecord);

    SimpleLogger.consoleLog(severity, message, attributes);
  }

  /**
   * Log at TRACE level.
   */
  trace(message: unknown, attributes: Record<string, unknown> = {}): void {
    this.log(SeverityNumber.TRACE, message, attributes);
  }

  /**
   * Log at DEBUG level.
   */
  debug(message: unknown, attributes: Record<string, unknown> = {}): void {
    this.log(SeverityNumber.DEBUG, message, attributes);
  }

  /**
   * Log at INFO level.
   */
  info(message: unknown, attributes: Record<string, unknown> = {}): void {
    this.log(SeverityNumber.INFO, message, attributes);
  }

  /**
   * Log at WARN level.
   */
  warn(message: unknown, attributes: Record<string, unknown> = {}): void {
    this.log(SeverityNumber.WARN, message, attributes);
  }

  /**
   * Log at ERROR level.
   */
  error(message: unknown, attributes: Record<string, unknown> = {}): void {
    this.log(SeverityNumber.ERROR, message, attributes);
  }

  /**
   * Log at FATAL level.
   */
  fatal(message: unknown, attributes: Record<string, unknown> = {}): void {
    this.log(SeverityNumber.FATAL, message, attributes);
  }

  /**
   * Get all logs and clear the buffer.
   */
  flush(): LogsData {
    const scopeLogs = createScopeLogs(this.scope, [...this.logs]);
    const resourceLogs = createResourceLogs(this.resource, [scopeLogs]);
    const logsData = createLogsData([resourceLogs]);

    this.logs = []; // Clear the buffer
    return logsData;
  }

  /**
   * Get current logs without clearing the buffer.
   */
  getLogs(): LogsData {
    const scopeLogs = createScopeLogs(this.scope, [...this.logs]);
    const resourceLogs = createResourceLogs(this.resource, [scopeLogs]);
    return createLogsData([resourceLogs]);
  }
}

export class FileLogger extends SimpleLogger {
  private fileHandle: LuaFile;

  constructor(
    filePath: string,
    serviceName: string,
    serviceVersion: string = "1.0.0",
    resourceAttributes: Record<string, unknown> = {}
  ) {
    super(serviceName, serviceVersion, resourceAttributes);

    const [fileHandle, err] = io.open(filePath, "a");
    if (err) {
      throw new Error(`Failed to open file ${filePath}: ${err}`);
    }
    this.fileHandle = fileHandle!;
  }

  /**
   * Function to write ndjson formatted logs to a file.
   * Compatible with pino-pretty.
   */
  private writeToFile(
    severity: SeverityNumber,
    message: unknown,
    attributes: Record<string, unknown> = {}
  ): void {
    this.fileHandle.write(
      textutils.serialiseJSON({
        level: getSeverityText(severity),
        msg: message,
        ts: os.epoch("utc"),
        ...attributes,
      }) + "\n"
    );
  }

  log(
    severity: SeverityNumber,
    message: unknown,
    attributes: Record<string, unknown> = {}
  ): void {
    this.writeToFile(severity, message, attributes);
    super.log(severity, message, attributes);
  }
}
