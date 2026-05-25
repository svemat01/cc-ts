declare const showcaseRuntime: {
    banner(title: string): string;
    kv(label: string, value: string | number | boolean): string;
    rule(char?: string, width?: number): string;
};

export = showcaseRuntime;
