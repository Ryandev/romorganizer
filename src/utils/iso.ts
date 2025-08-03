import { $ } from 'zx';
import { log } from './logger';
import storage from './storage';
import { doesCommandExist, isCommandExecutable } from './command';
import { guard, guardFileExists } from './guard';
import { withTimeout } from './promise';
import path from 'node:path';

/* 5 minutes */
const DEFAULT_TIMEOUT_MS = 300_000;

const POWERISO_PATH = 'poweriso';

const ERROR_POWERISO_NOT_INSTALLED = `
PowerISO operations failed. Please ensure poweriso is installed and executable:\n
- Windows: Download from https://www.poweriso.com/\n
- macOS: Available through various package managers\n
- Linux: Available through various package managers
`;

/**
 * Converts ISO to BIN/CUE format using poweriso
 * @param filePath - Path to the ISO file
 * @returns Promise resolving to an object with bin and cue file paths
 */
async function convert(
    filePath: string,
    format: 'bin' | 'iso' | 'daa' = 'bin'
): Promise<string> {
    guardFileExists(
        filePath,
        `Cannot extract ${filePath} as it does not exist`
    );

    const currentFileExtension = path.extname(filePath);
    if (currentFileExtension === format) {
        return filePath;
    }

    try {
        log.info(`Converting ${filePath} to BIN/CUE format`);

        /* Check if poweriso is available */
        const command = POWERISO_PATH;
        const commandExists = await doesCommandExist(command);
        const commandExecutable = await isCommandExecutable(command);
        guard(commandExists && commandExecutable, ERROR_POWERISO_NOT_INSTALLED);

        const outputDir = await storage().createTemporaryDirectory();

        /* Generate output filenames */
        const baseName = path.basename(filePath, path.extname(filePath));
        const binFileName = `${baseName}.bin`;
        const binPath = path.join(outputDir, binFileName);

        /* PowerISO convert command: poweriso convert "input.iso" "output.bin" "output.cue" */
        const output = await withTimeout(
            $`${command} convert "${filePath}" -o "${binPath}"`,
            DEFAULT_TIMEOUT_MS
        );
        guard(output.exitCode === 0, `Conversion failed for ${filePath}`);

        guardFileExists(
            binPath,
            `Bin file missing, does not exist: ${binPath}`
        );

        return binPath;
    } catch (error) {
        throw new Error(`Failed to convert ${filePath} to BIN/CUE: ${error}`);
    }
}

export default {
    convert,
};
