import { IRunner } from './interface';
import { helpText, HelpSchema } from './help.cli';
import { z } from 'zod';

export class Runner implements IRunner<string> {
    constructor(private readonly schema: z.infer<typeof HelpSchema>) {}

    getHelpText(): string {
        return helpText(this.schema);
    }

    start(): Promise<string> {
        /* Show help text and exit */
        return Promise.resolve(this.getHelpText());
    }
}
