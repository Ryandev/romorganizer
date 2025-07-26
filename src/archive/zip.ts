import { log } from '../utils/logger.js';
import { BaseArchive } from './base.js';
import extract from 'extract-zip';
import archiver from 'archiver';
import { createWriteStream } from 'node:fs';
import storage from '../utils/storage.js';

export class ZipArchive extends BaseArchive {
    constructor(filePath: string) {
        super(filePath);
    }

    async extract(): Promise<string> {
        this.validatePaths();

        const outputDir = await this.createTemporaryDirectory();
        try {
            log.info(`Extracting ${this.filePath} to ${outputDir}`);

            await extract(this.filePath, { dir: outputDir });

            await this.moveContentsFromSubdirectories(outputDir);
            log.info(`Done extracting ${this.filePath} to ${outputDir}`);
            return outputDir;
        } catch (error) {
            abort(
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

            // Try to extract to a temporary location to verify the zip is valid
            const tempDir = await this.createTemporaryDirectory();
            await extract(this.filePath, { dir: tempDir });

            // Clean up the temporary directory
            await storageInstance.remove(tempDir);

            log.info(`✓ ${this.filePath} is valid`);
            return true;
        } catch (error) {
            log.warn(`✗ ${this.filePath} is corrupted or invalid: ${error}`);
            return false;
        }
    }

    async compress(contentsDirectory: string): Promise<string> {
        this.validateCompressPaths(contentsDirectory);

        try {
            log.info(`Compressing ${contentsDirectory} to ${this.filePath}`);

            return new Promise((resolve, reject) => {
                const output = createWriteStream(this.filePath);
                const archive = archiver('zip', {
                    zlib: { level: 9 }, // Sets the compression level
                });

                output.on('close', () => {
                    log.info(`✓ Successfully compressed to ${this.filePath}`);
                    resolve(this.filePath);
                });

                archive.on('error', err => {
                    reject(err);
                });

                archive.pipe(output);

                // Add the entire directory to the archive
                archive.directory(contentsDirectory, false);

                archive.finalize();
            });
        } catch (error) {
            abort(
                `Failed to compress ${contentsDirectory} to ${this.filePath}: ${error}`
            );
        }
    }
}
