import { IRunner, RunnerBuilder } from "./interface";
import { VerifyRunnerDirectory } from "./verify";
import { parseVerifyArguments } from "./verify.cli";
import { VERIFY_HELP_TEXT } from "./verify.help";
import { loadDatFromPath } from "../utils/datLoader";
import { loadCuesheetsFromZip } from "../utils/cuesheetLoader";
import { log } from "../utils/logger";

export default function builder(parameters: string[]): RunnerBuilder<string[]> {
    const parsedArguments = parseVerifyArguments(parameters);

    return {
        create: async (): Promise<IRunner<string[]>> => {
            /* Preload the DAT file once to avoid loading it for each file */
            log.info(`Preloading DAT file: ${parsedArguments.datFile}`);
            const dat = await loadDatFromPath(parsedArguments.datFile);
            log.info(`Loaded DAT file with ${dat.games.length} games`);
        
            /* Load cuesheets if provided */
            log.info(`Loading cuesheets from: ${parsedArguments.cuesheetsFile}`);
            const cuesheetEntries = await loadCuesheetsFromZip(parsedArguments.cuesheetsFile);
            log.info(`Loaded ${cuesheetEntries.length} cuesheet entries`);
        
            const runner = new VerifyRunnerDirectory(parsedArguments.sourceDir, dat, cuesheetEntries, parsedArguments.rename, parsedArguments.force);
            return runner;
        },
        getHelpText: () => VERIFY_HELP_TEXT,
    };
}
