import showcaseRuntime from "../showcase_runtime.lib";

export function formatValue(value: unknown): string {
    if (value === undefined) {
        return "nil";
    }

    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }

    return textutils.serialize(value, { compact: false });
}

export function printSection(title: string): void {
    print(showcaseRuntime.banner(title));
}

export function printValue(label: string, value: unknown): void {
    print(showcaseRuntime.kv(label, formatValue(value)));
}

export function printStructured(title: string, value: unknown): void {
    printSection(title);
    print(textutils.serialize(value, { compact: false }));
}

export function printLines(title: string, lines: string[]): void {
    printSection(title);
    for (const line of lines) {
        print(line);
    }
}
