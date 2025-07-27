import { $ } from 'zx';
import { log } from './logger';
import { guardFileExists } from './guard';
import storage from './storage';
import path from 'node:path';

export interface ChdManager {
    create(options: {
        cueFilePath: string;
        binFilePath?: string;
    }): Promise<string>;
    extract(options: { chdFilePath: string }): Promise<string>;
    verify(options: { chdFilePath: string }): Promise<void>;
}

async function createChdFile(options: {
    cueFilePath: string;
    binFilePath?: string;
}): Promise<string> {
    const { cueFilePath, binFilePath } = options;
    const actualBinFilePath =
        binFilePath || cueFilePath.replace('.cue', '.bin');

    guardFileExists(cueFilePath, `Cue file does not exist: ${cueFilePath}`);
    guardFileExists(
        actualBinFilePath,
        `Bin file does not exist: ${actualBinFilePath}`
    );

    const temporaryDirectory = await storage().createTemporaryDirectory()

    const outputFileName = path.basename(cueFilePath, '.cue') + '.chd';

    const outputFilePath = path.join(temporaryDirectory, outputFileName);

    log.info(`Creating ${outputFilePath}`);

    await $`chdman createcd -f -i "${cueFilePath}" -o "${outputFilePath}"`;

    guardFileExists(outputFilePath, `CHD file does not exist: ${outputFilePath}`);

    log.info(`Successfully created ${outputFilePath}`);

    return outputFilePath;
}

async function extractChdFile(options: {
    chdFilePath: string;
}): Promise<string> {
    const { chdFilePath } = options;
    guardFileExists(chdFilePath, `CHD file does not exist: ${chdFilePath}`);

    const temporaryDirectory = await storage().createTemporaryDirectory()

    const cueFileName = path.basename(chdFilePath, '.chd') + '.cue';
    const outputCueFilePath = path.join(temporaryDirectory, cueFileName);

    log.info(`Extracting ${chdFilePath} to ${outputCueFilePath}`);

    await $`chdman extractcd --force --input "${chdFilePath}" --output "${outputCueFilePath}"`;

    guardFileExists(outputCueFilePath, `Cue file does not exist: ${outputCueFilePath}`);
    log.info(`Successfully extracted ${chdFilePath} to ${outputCueFilePath}`);

    return outputCueFilePath;
}

async function verifyChdFile(options: { chdFilePath: string }): Promise<void> {
    const { chdFilePath } = options;
    guardFileExists(chdFilePath, `CHD file does not exist: ${chdFilePath}`);

    log.info(`Verifying ${chdFilePath}`);

    await $`chdman verify --input "${chdFilePath}"`;

    log.info(`Successfully verified ${chdFilePath}`);
}

export default {
    create: createChdFile,
    extract: extractChdFile,
    verify: verifyChdFile,
}
