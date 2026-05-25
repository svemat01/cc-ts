import { createSandcornGenerator } from "@cc-ts/helpers/utils/sandcorn";
import { waitForLookup, waitForResponse } from "@cc-ts/helpers/utils/rednet";

import config from "./data/showcase.json";
import { printLines, printSection, printValue } from "./shared/print";

interface StatusRequest {
    tx: string;
    command: "showcase.status";
    requestedBy: number;
}

interface StatusResponse {
    tx: string;
    label: string;
    fuelLevel: number;
    queuedJobs: number;
}

function openFirstModem(): boolean {
    let opened = false;

    peripheral.find("modem", (name) => {
        if (!rednet.isOpen(name)) {
            rednet.open(name);
        }
        opened = true;
        return true;
    });

    return opened;
}

printSection("Network Helper Demo");
printLines("Flow", [
    "1. Open the first modem we can find.",
    "2. Resolve a peer with waitForLookup().",
    "3. Send a tx-tagged request.",
    "4. Wait for the matching reply with waitForResponse().",
]);

if (!openFirstModem()) {
    print("No modem found. Attach one and rerun this program.");
} else {
    const recipient = waitForLookup(
        config.network.protocol,
        config.network.hostname
    );
    const nextId = createSandcornGenerator();
    const tx = nextId();
    const request: StatusRequest = {
        tx,
        command: "showcase.status",
        requestedBy: os.getComputerID(),
    };

    rednet.send(recipient, request, config.network.protocol);
    printValue("recipient", recipient);
    printValue("request tx", tx);

    const [senderId, reply] = waitForResponse<StatusResponse>(
        tx,
        config.network.protocol,
        config.network.timeoutSeconds
    );

    if (!senderId || !reply) {
        print("No matching reply arrived before the timeout expired.");
    } else {
        printValue("sender", senderId);
        printValue("label", reply.label);
        printValue("fuel level", reply.fuelLevel);
        printValue("queued jobs", reply.queuedJobs);
    }
}
