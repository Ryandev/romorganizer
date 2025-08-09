import { $ } from 'zx';
import { log } from '../utils/logger';
import { Archive } from './interface';
import storage from '../utils/storage';
import storageDecorator from '../utils/storage.decorator';
import { IStorage } from '../utils/storage.interface';
import { doesCommandExist, isCommandExecutable } from '../utils/command';
import { moveContentsFromSubdirectories } from '../utils/archive-utils';
import { guardFileExists, guardDirectoryExists } from '../utils/guard';

const MAP_EXTRACT_COMMANDS = {
    '7z': (filePath: string, outputDir: string) =>
        $`7z x ${filePath} -o${outputDir} -y`,
    '7za': (filePath: string, outputDir: string) =>
        $`7za x ${filePath} -o${outputDir} -y`,
    p7zip: (filePath: string, outputDir: string) =>
        $`p7zip -d ${filePath} -o${outputDir}`,
} as const;

const MAP_VERIFY_COMMANDS = {
    '7z': (filePath: string) => $`7z t ${filePath}`,
    '7za': (filePath: string) => $`7za t ${filePath}`,
    p7zip: (filePath: string) => $`p7zip -t ${filePath}`,
} as const;

const MAP_COMPRESS_COMMANDS = {
    '7z': (filePath: string, contentsDirectory: string) =>
        $`7z a ${filePath} ${contentsDirectory}/* -y`,
    '7za': (filePath: string, contentsDirectory: string) =>
        $`7za a ${filePath} ${contentsDirectory}/* -y`,
    p7zip: (filePath: string, contentsDirectory: string) =>
        $`p7zip -a ${filePath} ${contentsDirectory}/*`,
} as const;

async function _getInstalledCommands(): Promise<
    (keyof typeof MAP_EXTRACT_COMMANDS)[]
> {
    const commands: (keyof typeof MAP_EXTRACT_COMMANDS)[] = [];
    for (const name of Object.keys(
        MAP_EXTRACT_COMMANDS
    ) as (keyof typeof MAP_EXTRACT_COMMANDS)[]) {
        if (
            (await doesCommandExist(name)) &&
            (await isCommandExecutable(name))
        ) {
            commands.push(name);
        }
    }
    return commands;
}

async function _getInstalledVerifyCommands(): Promise<
    (keyof typeof MAP_VERIFY_COMMANDS)[]
> {
    const commands: (keyof typeof MAP_VERIFY_COMMANDS)[] = [];
    for (const name of Object.keys(
        MAP_VERIFY_COMMANDS
    ) as (keyof typeof MAP_VERIFY_COMMANDS)[]) {
        if (
            (await doesCommandExist(name)) &&
            (await isCommandExecutable(name))
        ) {
            commands.push(name);
        }
    }
    return commands;
}

async function _getInstalledCompressCommands(): Promise<
    (keyof typeof MAP_COMPRESS_COMMANDS)[]
> {
    const commands: (keyof typeof MAP_COMPRESS_COMMANDS)[] = [];
    for (const name of Object.keys(
        MAP_COMPRESS_COMMANDS
    ) as (keyof typeof MAP_COMPRESS_COMMANDS)[]) {
        if (
            (await doesCommandExist(name)) &&
            (await isCommandExecutable(name))
        ) {
            commands.push(name);
        }
    }
    return commands;
}

const ERROR_7Z_NOT_INSTALLED = new Error(
    `7z extraction failed. Please ensure 7-Zip is installed:\n- Windows: Download from https://7-zip.org/\n- macOS: brew install p7zip\n- Linux: sudo apt install p7zip-full`
);

async function _extract(
    filePath: string,
    storageInstance: IStorage & { cleanup: () => Promise<void> }
): Promise<string> {
    guardFileExists(filePath, `file does not exist: ${filePath}`);
    const outputDir = await storageInstance.createTemporaryDirectory();
    try {
        log.info(`Extracting ${filePath} to ${outputDir}`);
        const viableCommands = await _getInstalledCommands();
        const primaryCommand = viableCommands[0];
        if (!primaryCommand) {
            throw ERROR_7Z_NOT_INSTALLED;
        }
        const extractCommand = MAP_EXTRACT_COMMANDS[primaryCommand];
        await extractCommand(filePath, outputDir);
        log.info(`✓ Successfully extracted using ${primaryCommand}`);
        await moveContentsFromSubdirectories(outputDir, filePath);
        log.info(`Done extracting ${filePath} to ${outputDir}`);
        return outputDir;
    } catch (error) {
        throw new Error(
            `Failed to extract ${filePath} to ${outputDir}: ${error}`
        );
    }
}

async function _verify(
    filePath: string,
    storageInstance: IStorage & { cleanup: () => Promise<void> }
): Promise<boolean> {
    guardFileExists(filePath, `file does not exist: ${filePath}`);
    log.info(`Verifying ${filePath}...`);
    try {
        /* Check if the file exists first */
        if (!(await storageInstance.exists(filePath))) {
            log.warn(`✗ ${filePath} does not exist`);
            return false;
        }
        const viableCommands = await _getInstalledVerifyCommands();
        const primaryCommand = viableCommands[0];
        if (!primaryCommand) {
            log.warn(`✗ No 7z commands available for verification`);
            return false;
        }
        const verifyCommand = MAP_VERIFY_COMMANDS[primaryCommand];
        try {
            await verifyCommand(filePath);
            log.info(`✓ Successfully verified using ${primaryCommand}`);
            return true;
        } catch {
            log.warn(
                `✗ ${filePath} is corrupted or invalid: Verification failed with ${primaryCommand}`
            );
            return false;
        }
    } catch (error) {
        log.warn(`✗ ${filePath} is corrupted or invalid: ${error}`);
        return false;
    }
}

async function _compress(
    filePath: string,
    contentsDirectory: string
): Promise<string> {
    guardDirectoryExists(
        contentsDirectory,
        `Contents directory does not exist: ${contentsDirectory}`
    );
    try {
        log.info(`Compressing ${contentsDirectory} to ${filePath}`);
        const viableCommands = await _getInstalledCompressCommands();
        const primaryCommand = viableCommands[0];
        if (!primaryCommand) {
            throw ERROR_7Z_NOT_INSTALLED;
        }
        const compressCommand = MAP_COMPRESS_COMMANDS[primaryCommand];
        await compressCommand(filePath, contentsDirectory);
        log.info(`✓ Successfully compressed using ${primaryCommand}`);
        log.info(`✓ Successfully compressed to ${filePath}`);
        return filePath;
    } catch (error) {
        throw new Error(
            `Failed to compress ${contentsDirectory} to ${filePath}: ${error}`
        );
    }
}

/**
 * Creates a 7-Zip archive handler that implements the Archive interface
 * @param filePath - Path to the 7-Zip file
 * @returns An object implementing the Archive interface for 7-Zip files with automatic cleanup
 */
export function createSevenZipArchive(filePath: string): Archive {
    const archive = {
        _storageInstance: storageDecorator.withCleanup(storage()),

        archiveFile(): string {
            return filePath;
        },

        async extract(): Promise<string> {
            return _extract(filePath, this._storageInstance);
        },

        async verify(): Promise<boolean> {
            return _verify(filePath, this._storageInstance);
        },

        async compress(contentsDirectory: string): Promise<string> {
            return _compress(filePath, contentsDirectory);
        },
    } as const;

    /* Add Symbol.dispose for automatic cleanup when the Archive object is destroyed */
    Object.defineProperty(archive, Symbol.dispose, {
        value: async () => {
            try {
                await archive._storageInstance.cleanup();
                log.info('7-Zip Archive cleanup completed');
            } catch (error) {
                log.warn(`7-Zip Archive cleanup failed: ${error}`);
            }
        },
        writable: false,
        enumerable: false,
        configurable: false,
    });

    return archive;
}
