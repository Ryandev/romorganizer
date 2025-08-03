import { $ } from 'zx';
import { log } from './logger';
import storage from './storage';
import { doesCommandExist, isCommandExecutable } from './command';
import { guard, guardFileExists } from './guard';
import { withTimeout } from './promise';
import path from 'node:path';

/* 5 minutes */
const DEFAULT_TIMEOUT_MS = 300_000;

const ERROR_IAT_NOT_INSTALLED = `
IAT conversion failed. Please ensure iat is installed and executable:\n
- macOS: brew install iat\n
- Ubuntu/Debian: sudo apt-get install iat
`;

/**
 * Extracts/converts MDF/MDS files to ISO format using iat
 * @param filePath - Path to the MDF/MDS file
 * @returns Promise resolving to the path of the converted ISO file
 */
export async function convertToIso(filePath: string): Promise<string> {
    try {
        log.info(`Converting ${filePath} to ISO format`);

        /* Check if iat is available */
        const command = 'iat';
        const commandExists = await doesCommandExist(command);
        const commandExecutable = await isCommandExecutable(command);
        guard(commandExists && commandExecutable, ERROR_IAT_NOT_INSTALLED);

        const outputDir = await storage().createTemporaryDirectory();

        /* Generate output ISO filename */
        const baseName = path.basename(filePath, path.extname(filePath));
        const isoFileName = `${baseName}.iso`;
        const isoFilePath = path.join(outputDir, isoFileName);

        log.info(`Using ${command} to convert ${filePath} to ${isoFilePath}`);
        const output = await withTimeout(
            $`iat --iso --input "${filePath}" --output "${isoFilePath}"`,
            DEFAULT_TIMEOUT_MS
        );
        guard(output.exitCode === 0, 'MDF to ISO conversion failed');

        guardFileExists(isoFilePath);

        return isoFilePath;
    } catch (error) {
        throw new Error(`Failed to convert ${filePath} to ISO: ${error}`);
    }
}

export default {
    convertToIso,
};
