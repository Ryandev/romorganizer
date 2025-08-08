import { IRunner, RunnerBuilder } from './interface';
import { RenameRunnerDirectory } from './rename';
import { parseRenameArguments } from './rename.cli';
import { RENAME_HELP_TEXT } from './rename.help';
import { loadDatFromPath } from '../utils/dat-loader';
import { loadCuesheetsPath } from '../utils/cuesheet-loader';
import { log } from '../utils/logger';
import storage from '../utils/storage';
import { guard } from '../utils/guard';

export default function builder(parameters: string[]): RunnerBuilder<string[]> {
    const parsedArguments = parseRenameArguments(parameters);

    return {
        create: async (): Promise<IRunner<string[]>> => {
            /* Preload the DAT file once to avoid loading it for each file */
            log.info(`Preloading DAT file: ${parsedArguments.datFile}`);
            const dat = await loadDatFromPath(parsedArguments.datFile);
            log.info(`Loaded DAT file with ${dat.games.length} games`);

            /* Load cuesheets if provided */
            log.info(
                `Loading cuesheets from: ${parsedArguments.cuesheetsFile}`
            );
            const exists = await storage().exists(parsedArguments.cuesheetsFile);
            guard(exists, `Cuesheets file not found: ${parsedArguments.cuesheetsFile}`);
            const cuesheetEntries = await loadCuesheetsPath(
                parsedArguments.cuesheetsFile
            );
            log.info(`Loaded ${cuesheetEntries.length} cuesheet entries`);

            const runner = new RenameRunnerDirectory(
                parsedArguments.sourceDir,
                dat,
                cuesheetEntries,
                parsedArguments.force
            );
            return runner;
        },
        getHelpText: () => RENAME_HELP_TEXT,
    };
}
