# 🚀 @cc-ts/crpc

> Type-safe RPC for ComputerCraft that speaks TRPC!

## What is CRPC?

CRPC is a TypeScript RPC framework specifically designed for ComputerCraft that maintains compatibility with [tRPC](https://trpc.io). It enables end-to-end typesafe APIs between ComputerCraft computers and either other computers or external tRPC servers.

Think of it as tRPC's quirky cousin who lives in Minecraft! 🎮

## ✨ Features

-   🔐 Full end-to-end type safety
-   🤝 Compatible with tRPC servers via WebSocket
-   🖥️ Native ComputerCraft Rednet support
-   📡 Built-in subscriptions support
-   🔌 Multiple transport options

## 🚀 Quick Start

```bash
bun add @cc-ts/crpc
```

### 🎯 Define Your Router

```typescript
import { initCRPC } from "@cc-ts/crpc";

const t = initCRPC.create();

const appRouter = t.router({
    greeting: t.procedure.input(z.string()).query((opts) => {
        return `Hello ${opts.input}!`;
    }),

    counter: t.procedure.subscription((opts) => {
        return observable<number>((observer) => {
            let count = 0;
            const timer = setInterval(() => {
                observer.next(count++);
            }, 1000);

            return () => clearInterval(timer);
        });
    }),
});

export type AppRouter = typeof appRouter;
```

### 🖥️ Create a Server

#### Rednet Server

```typescript
import { createRednetCRPCServer } from "@cc-ts/crpc/adapter/rednet";

// Open modem
peripheral.find("modem", (name) => {
    rednet.open(name);
});

// Create server
createRednetCRPCServer({
    router: appRouter,
});

print("CRPC Server running!");
```

### 📱 Create a Client

#### Rednet Client

```typescript
import { createCRPCClient } from "@cc-ts/crpc";
import { RednetCRPCTransport } from "@cc-ts/crpc/client/transports/rednet";

// Open modem
peripheral.find("modem", (name) => {
    rednet.open(name);
});

const client = createCRPCClient<AppRouter>({
    transport: new RednetCRPCTransport({
        recipient: 1, // Computer ID to connect to
    }),
});

// Make type-safe calls!
const greeting = await client.greeting.query("CRPC");
print(greeting); // "Hello CRPC!"

// Subscribe to updates
client.counter.subscribe(undefined, {
    onData: (count) => {
        print(`Count: ${count}`);
    },
});
```

#### WebSocket Client (connect to tRPC server)

```typescript
import { createCRPCClient } from "@cc-ts/crpc";
import { WebSocketCRPCTransport } from "@cc-ts/crpc/client/transports/websocket";

const transport = new WebSocketCRPCTransport({
    url: "ws://localhost:3000",
    reconnect: true,
    keepAliveTimeout: 10_000,
    maxReconnectAttempts: "infinite",
});

const client = createCRPCClient<AppRouter>({
    transport,
});

// Same API as Rednet client!
const greeting = await client.greeting.query("CRPC");
```

## 🔧 Advanced Usage

### Error Handling

```typescript
try {
    await client.greeting.query("");
} catch (err) {
    if (err instanceof CRPCClientError) {
        print("Something went wrong:", err.message);
    }
}
```

### Custom Context

```typescript
interface Context {
    user?: {
        id: string;
        name: string;
    };
}

const t = initCRPC.context<Context>().create();

const appRouter = t.router({
    me: t.procedure.query(({ ctx }) => {
        return ctx.user;
    }),
});
```

### Middleware

```typescript
const authMiddleware = t.middleware(({ next, ctx }) => {
    if (!ctx.user) {
        throw new CRPCError({
            code: "UNAUTHORIZED",
            message: "Must be logged in",
        });
    }
    return next();
});

const protectedProcedure = t.procedure.use(authMiddleware);
```

## 📚 Learn More

-   [tRPC Documentation](https://trpc.io/docs) - Most concepts apply to CRPC too!
-   [ComputerCraft Documentation](https://tweaked.cc/) - Learn about the platform
-   [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

-   [tRPC](https://trpc.io) - For the amazing foundation this project builds upon
-   [ComputerCraft](https://tweaked.cc/) - For making Minecraft programming fun
-   The TypeScript team - For giving us amazing type-safety

---

Made with ❤️ for the ComputerCraft community
