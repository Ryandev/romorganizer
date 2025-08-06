import { COMPRESS_HELP_TEXT } from './compress.help';
import { RunnerDirectory } from './compress';
import { parseCompressArguments } from './compress.cli';
import { RunnerBuilder } from './interface';

export default function builder(parameters: string[]): RunnerBuilder<string[]> {
    const parsedArguments = parseCompressArguments(parameters);
    return {
        create: () =>
            Promise.resolve(
                new RunnerDirectory(
                    parsedArguments.sourceDir,
                    parsedArguments.outputDir,
                    parsedArguments.tempDir,
                    parsedArguments.overwrite,
                    parsedArguments.removeSource
                )
            ),
        getHelpText: () => COMPRESS_HELP_TEXT,
    };
}
