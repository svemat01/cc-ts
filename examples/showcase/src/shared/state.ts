import { PersistedStore } from "@cc-ts/helpers/utils/persisted";

export interface RunSummary {
    id: string;
    label: string;
    jobsCompleted: number;
    durationSeconds: number;
    fuelLevel: number;
}

export interface ShowcaseState {
    runs: number;
    lastSessionId: string;
    lastLabel: string;
    lastFuelLevel: number;
    history: RunSummary[];
}

const STORE_NAME = "showcase.state";
const STORE_PATH = `persisted/${STORE_NAME}`;

const createDefaultState = (): ShowcaseState => ({
    runs: 0,
    lastSessionId: "none",
    lastLabel: "none",
    lastFuelLevel: 0,
    history: [],
});

const store = new PersistedStore<ShowcaseState>(STORE_NAME, createDefaultState());

function ensurePersistedDirectory(): void {
    if (!fs.exists("persisted")) {
        fs.makeDir("persisted");
    }
}

export function loadShowcaseStore(): PersistedStore<ShowcaseState> {
    ensurePersistedDirectory();

    if (fs.exists(STORE_PATH)) {
        store.load();
    } else {
        store.value = createDefaultState();
        store.save();
    }

    return store;
}

export function readShowcaseState(): ShowcaseState {
    return loadShowcaseStore().value;
}

export function resetShowcaseState(): ShowcaseState {
    ensurePersistedDirectory();
    store.value = createDefaultState();
    store.save();
    return store.value;
}
