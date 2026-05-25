import { AbortController, AbortSignal } from "@cc-ts/helpers/abortController";
import {
    PANIC,
    Panic,
    asyncSleep,
    on,
    runOsEventLoop,
    waitForEvent,
} from "@cc-ts/helpers/scheduler";

import config from "./data/showcase.json";
import { printLines, printSection, printValue } from "./shared/print";

declare module "@cc-ts/helpers/types" {
    interface Events {
        showcase_exit: [];
    }
}

const exitMessage = "showcase timer finished";
const controller = new AbortController();

on("key", (keyCode) => {
    if (keyCode === keys.q) {
        controller.abort(new Error("aborted with q"));
    }
});

on("terminate", () => {
    controller.abort(new Error("terminate event received"));
});

on("showcase_exit", () => {
    PANIC(exitMessage);
});

async function runTimerDemo(): Promise<void> {
    const timeoutSignal = AbortSignal.timeout(config.timers.autoStopMs);
    const signal = AbortSignal.any([controller.signal, timeoutSignal]);

    printSection("Scheduler Demo");
    printLines("Controls", [
        "Press q to abort the demo early.",
        "Press Enter after the countdown to finish cleanly.",
        `The demo also auto-aborts after ${config.timers.autoStopMs}ms.`,
    ]);

    try {
        for (let step = 1; step <= config.timers.stepCount; step++) {
            signal.throwIfAborted();
            printValue("tick", `${step}/${config.timers.stepCount}`);
            await asyncSleep(config.timers.tickMs);
        }

        print("Waiting for Enter so waitForEvent() has something visible to do...");
        await waitForEvent("key", (keyCode) => keyCode === keys.enter);
    } catch (error) {
        print(`Timer demo stopped: ${error}`);
    } finally {
        os.queueEvent("showcase_exit");
    }
}

void runTimerDemo();

try {
    runOsEventLoop();
} catch (error) {
    if (error instanceof Panic && error.message === exitMessage) {
        print("Timer demo exited cleanly.");
    } else {
        throw error;
    }
}
