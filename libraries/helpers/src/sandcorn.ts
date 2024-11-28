function blshift(x: number, y: number) {
    return x * Math.pow(2, y);
}
function brshift(x: number, y: number) {
    return Math.floor(x / Math.pow(2, y));
}

const MACHINE_ID_BITS = 12;
const SEQUENCE_BITS = 10;

export function createSandcornGenerator() {
    const machineId = os.getComputerID() + 1;

    let lastTick = 0;
    let seq = 0;

    return (tick: number = Math.floor(os.epoch() / 3600)) => {
        // subtract epoch from received timestamp
        // let tick = tick;

        // generate sequence number
        if (tick <= lastTick) {
            if (seq < Math.pow(2, SEQUENCE_BITS) - 1) {
                tick = lastTick;
                ++seq;
            } else {
                tick = ++lastTick;
                seq = 0;
            }
        } else {
            lastTick = tick;
            seq = 0;
        }

        print('currentTick', tick, 'machineId', machineId, 'seq', seq);

        // generate sunflake
        // return (currentTime << 10) | (machineId << 10) | seq;
        return (
            blshift(tick, MACHINE_ID_BITS + SEQUENCE_BITS) +
            blshift(machineId, SEQUENCE_BITS) +
            seq
        ).toString(36);
    };
}

export function decodeSandcorn(sandcorn: string) {
    let _sandcorn = tonumber(sandcorn, 36) || 0;

    const seq = _sandcorn % Math.pow(2, SEQUENCE_BITS);
    _sandcorn = brshift(_sandcorn, SEQUENCE_BITS);
    const machineId = _sandcorn % Math.pow(2, MACHINE_ID_BITS);
    _sandcorn = brshift(_sandcorn, MACHINE_ID_BITS);
    const tick = _sandcorn;

    return { tick, machineId, seq };
}
