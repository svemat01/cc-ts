# @cc-ts/helpers 🛠️

A collection of powerful utilities and helpers for ComputerCraft TypeScript projects. Think of it as your trusty toolbelt for building awesome CC programs!

## 📦 Installation

```bash
bun add @cc-ts/helpers
# or
npm install @cc-ts/helpers
# or
yarn add @cc-ts/helpers
```

## 🎯 Core Utilities

### Scheduler (`scheduler.ts`) ⏰

Promise-based event handling and scheduling for ComputerCraft. Perfect for building responsive applications!

```typescript
import { runOsEventLoop, asyncSleep, on } from "@cc-ts/helpers/core/scheduler";

// Handle events with type safety
on("mouse_click", (button, x, y) => {
    print(`Click at ${x},${y}`);
});

// Use modern async/await
async function main() {
    print("Starting task...");
    await asyncSleep(1000); // Wait 1 second
    print("Task complete!");
}

// Run your program
void main();
runOsEventLoop();
```

[Learn more about Scheduler](./src/scheduler.ts)

### CLI Parser (`cli-parser.ts`) 🎯

Build professional command-line interfaces with ease. Includes support for commands, subcommands, options, and help text.

```typescript
import {
    parseCliArgs,
    Command,
    executeCommand,
} from "@cc-ts/helpers/utils/cli-parser";

const commands: Command[] = [
    {
        name: "backup",
        description: "💾 Backup computer files",
        options: [
            {
                name: "destination",
                description: "Backup destination",
                defaultValue: "disk",
            },
        ],
        subcommands: [
            {
                name: "list",
                description: "📋 List available backups",
                action: (args) => {
                    print(`Listing backups in ${args.destination}`);
                },
            },
        ],
    },
];

executeCommand(parseCliArgs([...process.argv]), commands);
```

[Learn more about CLI Parser](./src/cli-parser.ts)

### Sandcorn (`sandcorn.ts`) 🌽

Distributed unique ID generation for ComputerCraft - like Snowflake, but for sand computers! Perfect for distributed systems.

```typescript
import {
    createSandcornGenerator,
    decodeSandcorn,
} from "@cc-ts/helpers/utils/sandcorn";

const generateId = createSandcornGenerator();

// Generate a unique, time-sortable ID
const id = generateId();

// Decode to see components
const { tick, machineId, seq } = decodeSandcorn(id);
print(`ID from computer ${machineId} at hour ${tick}`);
```

[Learn more about Sandcorn](./src/sandcorn.ts)

### Persisted Storage (`persisted.ts`) 💾

Simple but powerful persistent storage with type safety. Never lose data between restarts!

```typescript
import { PersistedStore } from "@cc-ts/helpers/utils/persisted";

// Create a typed store
interface GameState {
    highScore: number;
    lastPlayer: string;
}

const gameState = new PersistedStore<GameState>("game", {
    highScore: 0,
    lastPlayer: "",
});

// Load existing data
gameState.load();

// Update and auto-save
gameState.value.highScore = 1000;
gameState.save();
```

[Learn more about Persisted Storage](./src/persisted.ts)

### Proxy (`proxy.ts`) 🎭

Intercept and customize object behavior - great for debugging, validation, or creating virtual properties.

```typescript
import { createProxy } from "@cc-ts/helpers/utils/proxy";

// Create a logging proxy for a turtle
const turtle = createProxy(peripheral.find("turtle"), {
    get: (obj, key) => {
        print(`🐢 Turtle ${key} called`);
        return obj[key];
    },
});
```

[Learn more about Proxy](./src/proxy.ts)

### AbortController (`abortController.ts`) 🚦

Cancel async operations gracefully - essential for building responsive applications.

```typescript
import { AbortController } from "@cc-ts/helpers/utils/abortController";

async function mineShaft(signal: AbortSignal) {
    while (true) {
        signal.throwIfAborted();
        await turtle.digDown();
        await sleep(100);
    }
}

const controller = new AbortController();

// Start mining
void mineShaft(controller.signal);

// Stop if we hit diamond
events.on("diamond_detected", () => {
    controller.abort("Diamond found!");
});
```

[Learn more about AbortController](./src/abortController.ts)

## 📚 Additional Utilities

The library also includes several other helpful utilities:

-   🎮 **Event System** (`utils/event.ts`) - Type-safe wrapper for CC events
-   🎭 **Event Emitter** (`utils/eventEmitter.ts`) - Create custom event systems
-   🔗 **Rednet Helpers** (`utils/rednet.ts`) - Simplified network communication

Check the [API documentation](https://cc-ts.github.io/helpers) for details on these and other utilities.

## 📜 License

MIT - feel free to use in your own projects!

## 🤝 Contributing

Contributions welcome! Feel free to open issues or PRs.
