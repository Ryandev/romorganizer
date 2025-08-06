import { Runner } from './help';
import { RunnerBuilder } from './interface';
import { helpText, parseHelpArguments } from './help.cli';

export default function builder(parameters: string[]): RunnerBuilder<string> {
    const parsedArguments = parseHelpArguments(parameters);

    return {
        create: () => Promise.resolve(new Runner(parsedArguments)),
        getHelpText: () => helpText(parsedArguments),
    };
}
