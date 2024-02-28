/* eslint-disable unicorn/no-process-exit */
import { outro } from '@clack/prompts';

export class PromptError extends Error {
    constructor(message: string) {
        super(message);

        this.name = 'PromptError';
    }
}

export const exit = (message?: string, status = 1) => {
    outro(message);

    process.exit(status);
};
