import { EventEmitter, EventMap } from "@cc-ts/helpers/utils/eventEmitter";
import { createProxy } from "@cc-ts/helpers/utils/proxy";
import { createSandcornGenerator, decodeSandcorn } from "@cc-ts/helpers/utils/sandcorn";
import { Meter } from "@cc-ts/helpers/otel/helpers/instruments";
import { SimpleLogger } from "@cc-ts/helpers/otel/helpers/logs";
import { SimpleMetricsCollector } from "@cc-ts/helpers/otel/helpers/metrics";
import type { LogsData } from "@cc-ts/helpers/otel/types/logs";
import type { MetricsData } from "@cc-ts/helpers/otel/types/metrics";

import config from "../data/showcase.json";
import { printLines, printSection, printStructured, printValue, formatValue } from "./print";
import {
    loadShowcaseStore,
    readShowcaseState,
    type RunSummary,
    type ShowcaseState,
} from "./state";

type SessionEvents = {
    "job:started": [jobName: string];
    "job:finished": [jobName: string, durationSeconds: number, fuelLevel: number];
    "state:persisted": [runs: number, sessionId: string];
};

interface SessionModel {
    id: string;
    label: string;
    fuelLevel: number;
    totalDurationSeconds: number;
    completedJobs: string[];
}

export interface SessionResult {
    summary: RunSummary;
    state: ShowcaseState;
    logs: LogsData;
    metrics: MetricsData;
    sessionInfo: ReturnType<typeof decodeSandcorn>;
}

function createSessionModel(label: string): SessionModel {
    const nextId = createSandcornGenerator();

    return {
        id: nextId(),
        label,
        fuelLevel: config.initialFuelLevel,
        totalDurationSeconds: 0,
        completedJobs: [],
    };
}

export function runShowcaseSession(label = "manual-demo"): SessionResult {
    const store = loadShowcaseStore();
    const events = new EventEmitter<SessionEvents>();
    const logger = new SimpleLogger(
        config.telemetry.serviceName,
        config.version,
        {
            "computer.id": os.getComputerID(),
            "showcase.entrypoint": "main",
        }
    );
    const collector = new SimpleMetricsCollector(
        config.telemetry.serviceName,
        config.version,
        {
            "computer.id": os.getComputerID(),
            "showcase.entrypoint": "main",
        }
    );
    const meter = new Meter(collector);
    const completedCounter = meter.createCounter("showcase_jobs_completed_total", {
        description: "Number of sample jobs completed by the example workflow",
        unit: "jobs",
    });
    const fuelGauge = meter.createGauge("showcase_fuel_level", {
        description: "Remaining fuel after each sample job",
        unit: "fuel",
    });
    const durationHistogram = meter.createHistogram(
        "showcase_job_duration_seconds",
        {
            description: "Duration of each sample job",
            unit: "seconds",
            buckets: [0.25, 0.5, 1, 2, 5],
        }
    );
    const historyGauge = meter.createGauge("showcase_history_depth", {
        description: "Number of persisted run summaries kept in history",
        unit: "runs",
    });

    const session = createProxy(createSessionModel(label), {
        get(target, key) {
            return (target as unknown as Record<string, unknown>)[key];
        },
        set(target, key, value) {
            print(`proxy update -> ${key} = ${formatValue(value)}`);
            (target as unknown as Record<string, unknown>)[key] = value;
        },
    });
    const sessionInfo = decodeSandcorn(session.id);

    events.on("job:started", (jobName) => {
        print(`  -> ${jobName}`);
        logger.info("Starting showcase job", {
            "job.name": jobName,
            "session.id": session.id,
        });
    });

    events.on("job:finished", (jobName, durationSeconds, fuelLevel) => {
        completedCounter.add(1, { "job.name": jobName });
        fuelGauge.set(fuelLevel, { "job.name": jobName });
        durationHistogram.record(durationSeconds, { "job.name": jobName });
        logger.debug("Finished showcase job", {
            "job.name": jobName,
            "job.duration_seconds": durationSeconds,
            "session.fuel_level": fuelLevel,
        });
    });

    events.on("state:persisted", (runs, sessionId) => {
        historyGauge.set(store.value.history.length);
        logger.info("Persisted showcase state", {
            "showcase.runs": runs,
            "session.id": sessionId,
        });
    });

    printSection("Session Workflow");
    printValue("label", label);
    printValue("session id", session.id);
    printValue("machine id", sessionInfo.machineId);
    printValue("sequence", sessionInfo.seq);

    for (const job of config.jobTemplates) {
        events.emit("job:started", job.name);
        session.completedJobs = [...session.completedJobs, job.name];
        session.totalDurationSeconds =
            session.totalDurationSeconds + job.durationSeconds;
        session.fuelLevel = Math.max(0, session.fuelLevel - job.fuelCost);
        events.emit(
            "job:finished",
            job.name,
            job.durationSeconds,
            session.fuelLevel
        );
    }

    const summary: RunSummary = {
        id: session.id,
        label: session.label,
        jobsCompleted: session.completedJobs.length,
        durationSeconds: session.totalDurationSeconds,
        fuelLevel: session.fuelLevel,
    };

    store.value.runs += 1;
    store.value.lastSessionId = summary.id;
    store.value.lastLabel = summary.label;
    store.value.lastFuelLevel = summary.fuelLevel;
    store.value.history.push(summary);
    if (store.value.history.length > 5) {
        store.value.history = store.value.history.slice(-5);
    }
    store.save();
    events.emit("state:persisted", store.value.runs, summary.id);

    logger.info("Completed showcase session", {
        "session.id": summary.id,
        "session.jobs_completed": summary.jobsCompleted,
        "session.duration_seconds": summary.durationSeconds,
    });

    return {
        summary,
        state: store.value,
        logs: logger.flush(),
        metrics: collector.flush(),
        sessionInfo,
    };
}

export function buildTelemetrySnapshot(source = "telemetry-entrypoint"): {
    state: ShowcaseState;
    logs: LogsData;
    metrics: MetricsData;
} {
    const state = readShowcaseState();
    const logger = new SimpleLogger(
        config.telemetry.serviceName,
        config.version,
        {
            "computer.id": os.getComputerID(),
            "showcase.entrypoint": source,
        }
    );
    const collector = new SimpleMetricsCollector(
        config.telemetry.serviceName,
        config.version,
        {
            "computer.id": os.getComputerID(),
            "showcase.entrypoint": source,
        }
    );
    const meter = new Meter(collector);
    const runsGauge = meter.createGauge("showcase_runs_total", {
        description: "Total number of persisted sample runs",
        unit: "runs",
    });
    const fuelGauge = meter.createGauge("showcase_last_fuel_level", {
        description: "Fuel level recorded by the most recent run",
        unit: "fuel",
    });
    const durationHistogram = meter.createHistogram(
        "showcase_recent_duration_seconds",
        {
            description: "Durations of the persisted recent runs",
            unit: "seconds",
            buckets: [0.25, 0.5, 1, 2, 5, 10],
        }
    );

    runsGauge.set(state.runs);
    fuelGauge.set(state.lastFuelLevel);
    for (const run of state.history) {
        durationHistogram.record(run.durationSeconds, {
            "run.label": run.label,
        });
    }

    logger.info("Prepared telemetry snapshot", {
        "showcase.runs": state.runs,
        "showcase.last_label": state.lastLabel,
        "showcase.history_depth": state.history.length,
    });

    return {
        state,
        logs: logger.flush(),
        metrics: collector.flush(),
    };
}

export function printSessionResult(result: SessionResult): void {
    printLines("Run Summary", [
        `completed jobs: ${result.summary.jobsCompleted}`,
        `total duration: ${result.summary.durationSeconds}s`,
        `remaining fuel: ${result.summary.fuelLevel}`,
        `persisted runs: ${result.state.runs}`,
    ]);
    printStructured("Persisted State", result.state);
}

export function printTelemetrySnapshot(source?: string): void {
    const snapshot = buildTelemetrySnapshot(source);

    printStructured("Telemetry State Snapshot", snapshot.state);
    printStructured("OTEL Metrics", snapshot.metrics);
    printStructured("OTEL Logs", snapshot.logs);
}
