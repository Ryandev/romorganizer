import { $ } from 'zx';
import { log } from './logger';
import { guardFileExists } from './guard';
import storage from './storage';
import path from 'node:path';
import { guardCommandExists } from './guard';

export interface ChdManager {
    create(options: {
        cueFilePath: string;
        binFilePaths?: string[];
    }): Promise<string>;
    extract(options: { 
        chdFilePath: string;
        format: 'cue' | 'gdi' | 'iso';
    }): Promise<string>;
    verify(options: { chdFilePath: string }): Promise<void>;
}

async function createChdFile(options: {
    cueFilePath: string;
    binFilePaths?: string[];
}): Promise<string> {
    guardCommandExists('chdman');
    
    const { cueFilePath, binFilePaths } = options;

    // If no binFilePaths provided, try to infer from cue file
    let actualBinFilePaths: string[];
    if (!binFilePaths || binFilePaths.length === 0) {
        // Default behavior: assume single .bin file with same name as .cue file
        const defaultBinPath = cueFilePath.replace('.cue', '.bin');
        actualBinFilePaths = [defaultBinPath];
    } else {
        actualBinFilePaths = binFilePaths;
    }

    guardFileExists(cueFilePath, `Cue file does not exist: ${cueFilePath}`);
    
    // Verify all binary files exist
    for (const binFilePath of actualBinFilePaths) {
        guardFileExists(
            binFilePath,
            `Bin file does not exist: ${binFilePath}`
        );
    }

    const temporaryDirectory = await storage().createTemporaryDirectory()

    const outputFileName = path.basename(cueFilePath, '.cue') + '.chd';

    const outputFilePath = path.join(temporaryDirectory, outputFileName);

    log.info(`Creating ${outputFilePath} from cue file: ${cueFilePath}`);
    if (actualBinFilePaths.length > 1) {
        log.info(`Using ${actualBinFilePaths.length} binary files: ${actualBinFilePaths.join(', ')}`);
    }

    await $`chdman createcd --force --input "${cueFilePath}" --output "${outputFilePath}"`;

    guardFileExists(outputFilePath, `CHD file does not exist: ${outputFilePath}`);

    log.info(`Successfully created ${outputFilePath}`);

    return outputFilePath;
}

async function extractChdFile(options: {
    chdFilePath: string;
    format: 'cue' | 'gdi' | 'iso';
}): Promise<string> {
    guardCommandExists('chdman');

    const { chdFilePath } = options;
    guardFileExists(chdFilePath, `CHD file does not exist: ${chdFilePath}`);

    const temporaryDirectory = await storage().createTemporaryDirectory()

    const cueFileName = path.basename(chdFilePath, '.chd') + `.${options.format}`;
    const outputCueFilePath = path.join(temporaryDirectory, cueFileName);

    log.info(`Extracting ${chdFilePath} to ${outputCueFilePath}`);

    await $`chdman extractcd --force --input "${chdFilePath}" --output "${outputCueFilePath}"`;

    guardFileExists(outputCueFilePath, `Cue file does not exist: ${outputCueFilePath}`);
    log.info(`Successfully extracted ${chdFilePath} to ${outputCueFilePath}`);

    return outputCueFilePath;
}

async function verifyChdFile(options: { chdFilePath: string }): Promise<void> {
    guardCommandExists('chdman');

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
