import { $ } from 'zx';
import { log } from '../utils/logger';
import { BaseArchive } from './base';
import storage from '../utils/storage';
import { doesCommandExist, isCommandExecutable } from '../utils/command';
import { setTimeout } from 'node:timers';

// Helper function to add timeout to zx commands
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Command timed out')), timeoutMs)
        )
    ]);
}

const MAP_EXTRACT_COMMANDS = {
    'unrar': (filePath: string, outputDir: string) => withTimeout($`unrar x "${filePath}" "${outputDir}"`),
    'unrar-free': (filePath: string, outputDir: string) => withTimeout($`unrar-free x "${filePath}" "${outputDir}"`),
    'rar': (filePath: string, outputDir: string) => withTimeout($`rar x "${filePath}" "${outputDir}"`),
} as const;

const MAP_COMPRESS_COMMANDS = {
    'rar': (filePath: string, contentsDirectory: string) => withTimeout($`rar a "${filePath}" "${contentsDirectory}/*"`),
    'winrar': (filePath: string, contentsDirectory: string) => withTimeout($`winrar a "${filePath}" "${contentsDirectory}/*"`),
} as const;

async function _getInstalledExtractCommands(): Promise<(keyof typeof MAP_EXTRACT_COMMANDS)[]> {
    const commands: (keyof typeof MAP_EXTRACT_COMMANDS)[] = [];
    for (const name of Object.keys(MAP_EXTRACT_COMMANDS) as (keyof typeof MAP_EXTRACT_COMMANDS)[]) {
        if (await doesCommandExist(name) && await isCommandExecutable(name)) {
            commands.push(name);
        }
    }
    return commands;
}

async function _getInstalledCompressCommands(): Promise<(keyof typeof MAP_COMPRESS_COMMANDS)[]> {
    const commands: (keyof typeof MAP_COMPRESS_COMMANDS)[] = [];
    for (const name of Object.keys(MAP_COMPRESS_COMMANDS) as (keyof typeof MAP_COMPRESS_COMMANDS)[]) {
        if (await doesCommandExist(name) && await isCommandExecutable(name)) {
            commands.push(name);
        }
    }
    return commands;
}

const ERROR_RAR_NOT_INSTALLED = new Error(`RAR extraction failed. Please ensure unrar is installed and executable:\n- Windows: Download from https://www.win-rar.com/\n- macOS: brew install unrar (may need to approve in Security & Privacy)\n- Linux: sudo apt install unrar`);
const ERROR_RAR_COMPRESS_NOT_INSTALLED = new Error(`RAR compression failed. Please ensure rar is installed and executable:\n- Windows: Download WinRAR from https://www.win-rar.com/\n- macOS: brew install rar (may need to approve in Security & Privacy)\n- Linux: sudo apt install rar`);

export class RarArchive extends BaseArchive {
    constructor(filePath: string) {
        super(filePath);
    }

    async extract(): Promise<string> {
        this.validatePaths();
        const outputDir = await this.createTemporaryDirectory();
        try {
            log.info(`Extracting ${this.filePath} to ${outputDir}`);
            const viableCommands = await _getInstalledExtractCommands();
            const primaryCommand = viableCommands[0];
            if (!primaryCommand) {
                throw ERROR_RAR_NOT_INSTALLED;
            }
            const extractCommand = MAP_EXTRACT_COMMANDS[primaryCommand];
            await extractCommand(this.filePath, outputDir);
            log.info(`✓ Successfully extracted using ${primaryCommand}`);
            await this.moveContentsFromSubdirectories(outputDir);
            log.info(`Done extracting ${this.filePath} to ${outputDir}`);
            return outputDir;
        } catch (error) {
            throw new Error(
                `Failed to extract ${this.filePath} to ${outputDir}: ${error}`
            );
        }
    }

    async verify(): Promise<boolean> {
        log.info(`Verifying ${this.filePath}...`);
        try {
            // Check if the file exists first
            const storageInstance = await storage();
            if (!(await storageInstance.exists(this.filePath))) {
                log.warn(`✗ ${this.filePath} does not exist`);
                return false;
            }
            
            const verifyCommands = [
                { name: 'unrar', command: () => withTimeout($`unrar t "${this.filePath}"`) },
                { name: 'unrar-free', command: () => withTimeout($`unrar-free t "${this.filePath}"`) },
                { name: 'rar', command: () => withTimeout($`rar t "${this.filePath}"`) },
            ];
            const viableCommands = [];
            for (const { name, command } of verifyCommands) {
                if (await doesCommandExist(name) && await isCommandExecutable(name)) {
                    viableCommands.push({ name, command });
                }
            }
            if (viableCommands.length === 0) {
                log.warn(`✗ No unrar command found on system`);
                return false;
            }
            for (const { name, command } of viableCommands) {
                try {
                    await command();
                    log.info(`✓ Successfully verified using ${name}`);
                    return true;
                } catch {
                    log.info(`✗ ${name} verification failed, trying next command...`);
                }
            }
            log.warn(`✗ ${this.filePath} is corrupted or invalid: All verification commands failed`);
            return false;
        } catch (error) {
            log.warn(`✗ ${this.filePath} is corrupted or invalid: ${error}`);
            return false;
        }
    }

    async compress(contentsDirectory: string): Promise<string> {
        this.validateCompressPaths(contentsDirectory);
        try {
            log.info(`Compressing ${contentsDirectory} to ${this.filePath}`);
            const viableCommands = await _getInstalledCompressCommands();
            const primaryCommand = viableCommands[0];
            if (!primaryCommand) {
                throw ERROR_RAR_COMPRESS_NOT_INSTALLED;
            }
            const compressCommand = MAP_COMPRESS_COMMANDS[primaryCommand];
            await compressCommand(this.filePath, contentsDirectory);
            log.info(`✓ Successfully compressed using ${primaryCommand}`);
            log.info(`✓ Successfully compressed to ${this.filePath}`);
            return this.filePath;
        } catch (error) {
            throw new Error(
                `Failed to compress ${contentsDirectory} to ${this.filePath}: ${error}`
            );
        }
    }
}
