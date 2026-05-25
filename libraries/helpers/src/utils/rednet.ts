export function waitForResponse<Message extends {tx: string}>(tx: string, PROTOCOL: string, timeout: number = 30) {
    const startTime = os.epoch();
    while (true) {
        const [senderId, message] = rednet.receive(PROTOCOL, 10);

        if (message?.tx === tx) {
            return $multi(senderId ?? undefined, message as Message);
        }

        if (os.epoch() - startTime > timeout * 1000) {
            return $multi(undefined, undefined);
        }
    }
}

export function waitForLookup(protocol: string, hostname?: string): number {
    const startTime = os.epoch();
    while (true) {
        print(`Looking up ${protocol} ${hostname}`)
        const id = hostname ? rednet.lookup(protocol, hostname) : rednet.lookup(protocol)?.[0];

        if (id !== undefined) {
            print(`Found ${protocol} ${hostname} at ${id}`);
            return id;
        }

        print(`Failed to find ${protocol} ${hostname}`);
        os.sleep(1);

        if (os.epoch() - startTime > 10000) {
            throw new Error(`Failed to lookup ${protocol} ${hostname} in 10 seconds`);
        }
    }
}
