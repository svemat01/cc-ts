import config from "./data/showcase.json";
import { printLines } from "./shared/print";
import { printTelemetrySnapshot } from "./shared/session";

printLines("Telemetry Entrypoint", [
    `service name: ${config.telemetry.serviceName}`,
    "This bundle builds a structured OTEL-shaped payload from persisted example state.",
]);
printTelemetrySnapshot("telemetry-entrypoint");
