import { IRunner, RunnerBuilder } from './interface';
import { RenameRunnerDirectory } from './rename';
import { parseRenameArguments } from './rename.cli';
import { RENAME_HELP_TEXT } from './rename.help';
import { log } from '../utils/logger';

export default function builder(parameters: string[]): RunnerBuilder<string[]> {
    const parsedArguments = parseRenameArguments(parameters);

    return {
        create: async (): Promise<IRunner<string[]>> => {
            log.info(
                `Starting rename process for directory: ${parsedArguments.sourceDir}`
            );

            const runner = new RenameRunnerDirectory(
                parsedArguments.sourceDir,
                parsedArguments.force
            );
            return runner;
        },
        getHelpText: () => RENAME_HELP_TEXT,
    };
}
