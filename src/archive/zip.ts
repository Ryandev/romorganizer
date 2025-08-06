import { log } from '../utils/logger';
import { Archive } from './interface';
import AdmZip from 'adm-zip';
import path from 'node:path';
import storage from '../utils/storage';
import storageDecorator from '../utils/storage.decorator';
import { IStorage } from '../utils/storage.interface';
import { moveContentsFromSubdirectories } from '../utils/archive-utils';
import { guardFileExists, guardDirectoryExists } from '../utils/guard';

async function _extract(filePath: string, storageInstance: IStorage & { cleanup: () => Promise<void> }): Promise<string> {
    guardFileExists(filePath, `file does not exist: ${filePath}`);

    const outputDir = await storageInstance.createTemporaryDirectory();
    try {
        log.info(`Extracting ${filePath} to ${outputDir}`);

        const zip = new AdmZip(filePath);
        zip.extractAllTo(
            outputDir,
            true
        ); /* true = overwrite existing files */

        await moveContentsFromSubdirectories(outputDir, filePath);
        log.info(`Done extracting ${filePath} to ${outputDir}`);
        return outputDir;
    } catch (error) {
        throw new Error(
            `Failed to extract ${filePath} to ${outputDir}: ${error}`
        );
    }
}

async function _verify(filePath: string, storageInstance: IStorage & { cleanup: () => Promise<void> }): Promise<boolean> {
    log.info(`Verifying ${filePath}...`);

    try {
        /* Check if the file exists first */
        if (!(await storageInstance.exists(filePath))) {
            log.warn(`✗ ${filePath} does not exist`);
            return false;
        }

        /* Try to read the zip file to verify it's valid */
        const zip = new AdmZip(filePath);
        const zipEntries = zip.getEntries();

        /* If we can get entries without error, the zip is valid */
        if (zipEntries.length >= 0) {
            log.info(`✓ ${filePath} is valid`);
            return true;
        }

        log.warn(`✗ ${filePath} is corrupted or invalid`);
        return false;
    } catch (error) {
        log.warn(`✗ ${filePath} is corrupted or invalid: ${error}`);
        return false;
    }
}

async function _compress(filePath: string, contentsDirectory: string, storageInstance: IStorage & { cleanup: () => Promise<void> }): Promise<string> {
    guardDirectoryExists(
        contentsDirectory,
        `Contents directory does not exist: ${contentsDirectory}`
    );

    try {
        log.info(`Compressing ${contentsDirectory} to ${filePath}`);

        const zip = new AdmZip();

        /* Add all files and directories from the contents directory */
        /* Exclude the zip file being created to avoid circular reference */
        await addDirectoryToZip(
            zip,
            contentsDirectory,
            '',
            filePath,
            storageInstance
        );

        /* Write the zip file */
        zip.writeZip(filePath);

        log.info(`✓ Successfully compressed to ${filePath}`);
        return filePath;
    } catch (error) {
        throw new Error(
            `Failed to compress ${contentsDirectory} to ${filePath}: ${error}`
        );
    }
}

/* Helper function to add directory contents to zip */
async function addDirectoryToZip(
    zip: AdmZip,
    sourcePath: string,
    zipPath: string,
    excludePath?: string,
    storageInstance?: IStorage & { cleanup: () => Promise<void> }
): Promise<void> {
    const storageInst = storageInstance || await storage();
    const items = await storageInst.list(sourcePath, {
        removePrefix: false,
    });

    for (const item of items) {
        const itemZipPath = zipPath
            ? path.join(zipPath, path.basename(item))
            : path.basename(item);

        /* Skip the file being created to avoid circular reference */
        if (excludePath && item === excludePath) {
            continue;
        }

        if (await storageInst.isDirectory(item)) {
            /* Recursively add subdirectories */
            await addDirectoryToZip(
                zip,
                item,
                itemZipPath,
                excludePath,
                storageInstance
            );
        } else {
            /* Add file to zip */
            try {
                const fileContent = await storageInst.read(item);
                zip.addFile(itemZipPath, Buffer.from(fileContent));
            } catch (error) {
                /* Skip files that can't be read */
                log.warn(`Skipping file ${item}: ${error}`);
            }
        }
    }
}

/**
 * Creates a ZIP archive handler that implements the Archive interface
 * @param filePath - Path to the ZIP file
 * @returns An object implementing the Archive interface for ZIP files with automatic cleanup
 */
export function createZipArchive(filePath: string): Archive {
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
            return _compress(filePath, contentsDirectory, this._storageInstance);
        },
    } as const;

    /* Add Symbol.dispose for automatic cleanup when the Archive object is destroyed */
    Object.defineProperty(archive, Symbol.dispose, {
        value: async () => {
            try {
                await archive._storageInstance.cleanup();
                log.info('ZIP Archive cleanup completed');
            } catch (error) {
                log.warn(`ZIP Archive cleanup failed: ${error}`);
            }
        },
        writable: false,
        enumerable: false,
        configurable: false,
    });

    return archive;
}
