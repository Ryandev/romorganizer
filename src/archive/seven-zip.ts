import { $ } from 'zx';
import { log } from '../utils/logger';
import { BaseArchive } from './base';
import storage from '../utils/storage';
import { doesCommandExist, isCommandExecutable } from '../utils/command';

const MAP_EXTRACT_COMMANDS = {
    '7z': (filePath: string, outputDir: string) =>
        $`7z x "${filePath}" -o"${outputDir}" -y`,
    '7za': (filePath: string, outputDir: string) =>
        $`7za x "${filePath}" -o"${outputDir}" -y`,
    p7zip: (filePath: string, outputDir: string) =>
        $`p7zip -d "${filePath}" -o"${outputDir}"`,
} as const;

const MAP_VERIFY_COMMANDS = {
    '7z': (filePath: string) => $`7z t "${filePath}"`,
    '7za': (filePath: string) => $`7za t "${filePath}"`,
    p7zip: (filePath: string) => $`p7zip -t "${filePath}"`,
} as const;

const MAP_COMPRESS_COMMANDS = {
    '7z': (filePath: string, contentsDirectory: string) =>
        $`7z a "${filePath}" "${contentsDirectory}/*" -y`,
    '7za': (filePath: string, contentsDirectory: string) =>
        $`7za a "${filePath}" "${contentsDirectory}/*" -y`,
    p7zip: (filePath: string, contentsDirectory: string) =>
        $`p7zip -a "${filePath}" "${contentsDirectory}/*"`,
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
const ERROR_7Z_COMPRESS_NOT_INSTALLED = new Error(
    `7z compression failed. Please ensure 7-Zip is installed:\n- Windows: Download from https://7-zip.org/\n- macOS: brew install p7zip\n- Linux: sudo apt install p7zip-full`
);

export class SevenZipArchive extends BaseArchive {
    constructor(filePath: string) {
        super(filePath);
    }

    async extract(): Promise<string> {
        this.validatePaths();
        const outputDir = await this.createTemporaryDirectory();
        try {
            log.info(`Extracting ${this.filePath} to ${outputDir}`);
            const viableCommands = await _getInstalledCommands();
            const primaryCommand = viableCommands[0];
            if (!primaryCommand) {
                throw ERROR_7Z_NOT_INSTALLED;
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
            /* Check if the file exists first */
            const storageInstance = await storage();
            if (!(await storageInstance.exists(this.filePath))) {
                log.warn(`✗ ${this.filePath} does not exist`);
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
                await verifyCommand(this.filePath);
                log.info(`✓ Successfully verified using ${primaryCommand}`);
                return true;
            } catch {
                log.warn(
                    `✗ ${this.filePath} is corrupted or invalid: Verification failed with ${primaryCommand}`
                );
                return false;
            }
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
                throw ERROR_7Z_COMPRESS_NOT_INSTALLED;
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
