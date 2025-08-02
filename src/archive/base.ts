import { join } from 'path';
import { $ } from 'zx';
import { log } from '../utils/logger';
import { guardFileExists, guardDirectoryExists } from '../utils/guard';
import storage from '../utils/storage';

export interface Archive {
    archiveFile: () => string;
    extract(): Promise<string>;
    verify(): Promise<boolean>;
    compress(contentsDirectory: string): Promise<string>;
}

/* Global temporary files array - will be managed by the main application */
declare global {
    var temporaryFiles: string[];
    function abort(message: string): never;
}

export abstract class BaseArchive implements Archive {
    protected filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    archiveFile(): string {
        return this.filePath;
    }

    abstract extract(): Promise<string>;
    abstract verify(): Promise<boolean>;
    abstract compress(contentsDirectory: string): Promise<string>;

    protected validatePaths(): void {
        guardFileExists(this.filePath, `file does not exist: ${this.filePath}`);
    }

    protected validateCompressPaths(contentsDirectory: string): void {
        guardDirectoryExists(
            contentsDirectory,
            `Contents directory does not exist: ${contentsDirectory}`
        );
    }

    protected async createTemporaryDirectory(): Promise<string> {
        const storageInstance = await storage();
        const tempDir = await storageInstance.createTemporaryDirectory();
        if (globalThis.temporaryFiles) {
            globalThis.temporaryFiles.push(tempDir);
        }
        return tempDir;
    }

    protected async moveContentsFromSubdirectories(
        outputDir: string
    ): Promise<void> {
        const storageInstance = await storage();

        const allItems = await storageInstance.list(outputDir, {
            recursive: false,
        });
        const itemsWithChecks = await Promise.all(
            allItems.map(async (item: string) => ({
                path: item,
                name: item.split('/').pop() || item,
                isFile: await storageInstance.isFile(item),
                isDirectory: await storageInstance.isDirectory(item),
            }))
        );

        const files = itemsWithChecks.filter(
            (item: {
                path: string;
                name: string;
                isFile: boolean;
                isDirectory: boolean;
            }) => item.isFile && !item.name.startsWith('.')
        );
        const dirs = itemsWithChecks.filter(
            (item: {
                path: string;
                name: string;
                isFile: boolean;
                isDirectory: boolean;
            }) => item.isDirectory && !item.name.startsWith('.')
        );

        log.info(`File count: ${files.length}, Dir count: ${dirs.length}`);

        if (files.length === 0 && dirs.length > 0) {
            for (const dir of dirs) {
                const subItems = await storageInstance.list(dir.path, {
                    recursive: false,
                });
                const subItemsWithChecks = await Promise.all(
                    subItems.map(async (item: string) => ({
                        path: item,
                        name: item.split('/').pop() || item,
                        isFile: await storageInstance.isFile(item),
                        isDirectory: await storageInstance.isDirectory(item),
                    }))
                );

                for (const subItem of subItemsWithChecks) {
                    if (subItem.name !== '.') {
                        const destPath = join(outputDir, subItem.name);
                        await storageInstance.copy(subItem.path, destPath);
                        await storageInstance.remove(subItem.path);
                    }
                }
            }
        }

        const extractedFiles = itemsWithChecks
            .filter(
                (item: {
                    path: string;
                    name: string;
                    isFile: boolean;
                    isDirectory: boolean;
                }) => item.isFile && !item.name.startsWith('.')
            )
            .map(
                (item: {
                    path: string;
                    name: string;
                    isFile: boolean;
                    isDirectory: boolean;
                }) => item.name
            );
        log.info(
            `Extracted ${this.filePath} to ${outputDir}, files ${extractedFiles.join(
                ', '
            )}`
        );
    }

    protected async checkCommand(
        command: string,
        installCmd: string
    ): Promise<void> {
        try {
            await $`command -v ${command}`;
        } catch {
            abort(`${command} is not installed. Install with: ${installCmd}`);
        }
    }

    protected async runVerifyCommand(command: string): Promise<boolean> {
        try {
            await $`${command}`;
            return true;
        } catch {
            return false;
        }
    }
}
