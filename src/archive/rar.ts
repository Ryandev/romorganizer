import { $ } from 'zx';
import { log } from '../utils/logger';
import { Archive } from './interface';
import storage from '../utils/storage';
import storageDecorator from '../utils/storage.decorator';
import { IStorage } from '../utils/storage.interface';
import { doesCommandExist, isCommandExecutable } from '../utils/command';
import { guard, guardDirectoryExists, guardFileExists } from '../utils/guard';
import { withTimeout } from '../utils/promise';

/* 5 minutes */
const DEFAULT_TIMEOUT_MS = 300_000;

/* Resolve in this order of preference */
const MAP_EXTRACT_COMMANDS = [
    {
        name: 'unrar',
        command: (
            filePath: string,
            outputDir: string,
            timeoutMs: number = DEFAULT_TIMEOUT_MS
        ) => withTimeout($`unrar x ${filePath} -ad ${outputDir}`, timeoutMs),
    },
    {
        name: 'unrar-free',
        command: (
            filePath: string,
            outputDir: string,
            timeoutMs: number = DEFAULT_TIMEOUT_MS
        ) => withTimeout($`unrar-free x ${filePath} ${outputDir}`, timeoutMs),
    },
    {
        name: 'tar',
        command: (
            filePath: string,
            outputDir: string,
            timeoutMs: number = DEFAULT_TIMEOUT_MS
        ) => withTimeout($`tar -xvf ${filePath} -C ${outputDir}`, timeoutMs),
    },
    {
        name: 'rar',
        command: (
            filePath: string,
            outputDir: string,
            timeoutMs: number = DEFAULT_TIMEOUT_MS
        ) => withTimeout($`rar x ${filePath} ${outputDir}`, timeoutMs),
    },
] as const;

/* Resolve in this order of preference */
const MAP_COMPRESS_COMMANDS = [
    {
        name: 'rar',
        command: (
            filePath: string,
            contentsDirectory: string,
            timeoutMs: number = DEFAULT_TIMEOUT_MS
        ) =>
            withTimeout($`rar a ${filePath} ${contentsDirectory}/*`, timeoutMs),
    },
    {
        name: 'winrar',
        command: (
            filePath: string,
            contentsDirectory: string,
            timeoutMs: number = DEFAULT_TIMEOUT_MS
        ) =>
            withTimeout(
                $`winrar a ${filePath} ${contentsDirectory}/*`,
                timeoutMs
            ),
    },
    {
        name: 'tar',
        command: (
            filePath: string,
            contentsDirectory: string,
            timeoutMs: number = DEFAULT_TIMEOUT_MS
        ) =>
            withTimeout(
                $`tar -cvf ${filePath} ${contentsDirectory}/*`,
                timeoutMs
            ),
    },
] as const;

async function _getInstalledExtractCommands(): Promise<string[]> {
    const commands: string[] = [];
    for (const { name } of MAP_EXTRACT_COMMANDS) {
        const commandExists = await doesCommandExist(name);
        const commandExecutable = await isCommandExecutable(name);
        if (commandExists && commandExecutable) {
            commands.push(name);
        }
    }
    return commands;
}

async function _getInstalledCompressCommands(): Promise<string[]> {
    const commands: string[] = [];
    for (const { name } of MAP_COMPRESS_COMMANDS) {
        const commandExists = await doesCommandExist(name);
        const commandExecutable = await isCommandExecutable(name);
        if (commandExists && commandExecutable) {
            commands.push(name);
        }
    }
    return commands;
}

const ERROR_RAR_NOT_INSTALLED = `RAR extraction failed. Please ensure unrar is installed and executable:\n- Windows: Download from https://www.win-rar.com/\n- macOS: brew install unrar (may need to approve in Security & Privacy)\n- Linux: sudo apt install unrar`;
const ERROR_RAR_COMPRESS_NOT_INSTALLED = `RAR compression failed. Please ensure rar is installed and executable:\n- Windows: Download WinRAR from https://www.win-rar.com/\n- macOS: brew install rar (may need to approve in Security & Privacy)\n- Linux: sudo apt install rar`;

async function _extract(
    filePath: string,
    storageInstance: IStorage & { cleanup: () => Promise<void> }
): Promise<string> {
    guardFileExists(filePath, `file does not exist: ${filePath}`);

    const outputDir = await storageInstance.createTemporaryDirectory();
    try {
        log.info(`Extracting ${filePath} to ${outputDir}`);
        const viableCommands = await _getInstalledExtractCommands();
        const primaryCommand = viableCommands[0];
        guard(primaryCommand !== undefined, ERROR_RAR_NOT_INSTALLED);
        const extractCommand = MAP_EXTRACT_COMMANDS.find(
            command => command.name === primaryCommand
        )?.command;
        guard(extractCommand !== undefined, ERROR_RAR_NOT_INSTALLED);
        log.info(
            `Using ${primaryCommand} to extract ${filePath} to ${outputDir}`
        );
        const output = await extractCommand(filePath, outputDir);
        guard(output.exitCode === 0, 'Extraction failed');
        log.info(`✓ Successfully extracted using ${primaryCommand}`);
        guardDirectoryExists(
            outputDir,
            `Output directory missing, does not exist: ${outputDir}`
        );
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

        const verifyCommands = [
            {
                name: 'unrar',
                command: (timeoutMs: number = DEFAULT_TIMEOUT_MS) =>
                    withTimeout($`unrar t ${filePath}`, timeoutMs),
            },
            {
                name: 'unrar-free',
                command: (timeoutMs: number = DEFAULT_TIMEOUT_MS) =>
                    withTimeout($`unrar-free t ${filePath}`, timeoutMs),
            },
            {
                name: 'rar',
                command: (timeoutMs: number = DEFAULT_TIMEOUT_MS) =>
                    withTimeout($`rar t ${filePath}`, timeoutMs),
            },
        ];
        const viableCommands = [];
        for (const { name, command } of verifyCommands) {
            if (
                (await doesCommandExist(name)) &&
                (await isCommandExecutable(name))
            ) {
                viableCommands.push({ name, command });
            }
        }
        if (viableCommands.length === 0) {
            log.warn(`✗ No unrar command found on system`);
            return false;
        }
        for (const { name, command } of viableCommands) {
            try {
                await command(DEFAULT_TIMEOUT_MS);
                log.info(`✓ Successfully verified using ${name}`);
                return true;
            } catch {
                log.info(
                    `✗ ${name} verification failed, trying next command...`
                );
            }
        }
        log.warn(
            `✗ ${filePath} is corrupted or invalid: All verification commands failed`
        );
        return false;
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
            throw ERROR_RAR_COMPRESS_NOT_INSTALLED;
        }
        const compressCommand = MAP_COMPRESS_COMMANDS.find(
            command => command.name === primaryCommand
        )?.command;
        guard(compressCommand !== undefined, ERROR_RAR_COMPRESS_NOT_INSTALLED);
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
 * Creates a RAR archive handler that implements the Archive interface
 * @param filePath - Path to the RAR file
 * @returns An object implementing the Archive interface for RAR files with automatic cleanup
 */
export function createRarArchive(filePath: string): Archive {
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
                log.info('RAR Archive cleanup completed');
            } catch (error) {
                log.warn(`RAR Archive cleanup failed: ${error}`);
            }
        },
        writable: false,
        enumerable: false,
        configurable: false,
    });

    return archive;
}
