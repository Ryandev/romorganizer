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
    guardFileExists(filePath, `MDF file missing, does not exist: ${filePath}`);

    try {
        /* Check if iat is available */
        const command = 'iat';
        const commandExists = await doesCommandExist(command);
        const commandExecutable = await isCommandExecutable(command);
        guard(commandExists && commandExecutable, ERROR_IAT_NOT_INSTALLED);

        log.info(`Converting ${filePath} to ISO format with ${command}`);

        const outputDir = await storage().createTemporaryDirectory();

        const sourceFileName = path.basename(filePath)

        await storage().copy(filePath, path.join(outputDir, sourceFileName));

        /* Generate output ISO filename */
        const baseName = path.basename(filePath, path.extname(filePath));
        const isoFileName = `${baseName}.iso`;
        const isoFilePath = path.join(outputDir, isoFileName);

        /* Iat does not work will full paths, so move file to temporary directory & work from there */
        log.info(`Using ${command} to convert ${filePath} to ${isoFilePath}`);

        /* iat expects --input & --output flags, Linux, does not have them  */
        if (process.platform === 'darwin') {
            const output = await withTimeout(
                $`iat --input=${filePath} --output=${isoFilePath} --iso`,
                DEFAULT_TIMEOUT_MS
            );
            guard(output.exitCode === 0, `MDF to ISO conversion failed, code: ${output.exitCode}`);

        } else {
            const output = await withTimeout(
                $({ cwd: outputDir })`iat ${sourceFileName} ${isoFileName}`,
                DEFAULT_TIMEOUT_MS
            );
            guard(output.exitCode === 0, `MDF to ISO conversion failed, code: ${output.exitCode}`);

        }

        await storage()
            .remove(path.join(outputDir, sourceFileName))
            .catch(() => {
                /* Ignore */
            });

        guardFileExists(isoFilePath);

        return isoFilePath;
    } catch (error) {
        throw new Error(
            `IAT conversion failed: ${JSON.stringify(error)}`
        );
    }
}

export default {
    convertToIso,
};
