import { log } from '../utils/logger';
import { BaseArchive } from './base';
import AdmZip from 'adm-zip';
import { join, basename } from 'node:path';
import storage from '../utils/storage';

export class ZipArchive extends BaseArchive {
    constructor(filePath: string) {
        super(filePath);
    }

    async extract(): Promise<string> {
        this.validatePaths();

        const outputDir = await this.createTemporaryDirectory();
        try {
            log.info(`Extracting ${this.filePath} to ${outputDir}`);

            const zip = new AdmZip(this.filePath);
            zip.extractAllTo(outputDir, true); // true = overwrite existing files

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

            // Try to read the zip file to verify it's valid
            const zip = new AdmZip(this.filePath);
            const zipEntries = zip.getEntries();
            
            // If we can get entries without error, the zip is valid
            if (zipEntries.length >= 0) {
                log.info(`✓ ${this.filePath} is valid`);
                return true;
            }

            log.warn(`✗ ${this.filePath} is corrupted or invalid`);
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

            const zip = new AdmZip();
            
            // Add all files and directories from the contents directory
            // Exclude the zip file being created to avoid circular reference
            await this.addDirectoryToZip(zip, contentsDirectory, '', this.filePath);
            
            // Write the zip file
            zip.writeZip(this.filePath);
            
            log.info(`✓ Successfully compressed to ${this.filePath}`);
            return this.filePath;
        } catch (error) {
            throw new Error(
                `Failed to compress ${contentsDirectory} to ${this.filePath}: ${error}`
            );
        }
    }

    private async addDirectoryToZip(zip: AdmZip, sourcePath: string, zipPath: string, excludePath?: string): Promise<void> {
        const storageInstance = await storage();
        const items = await storageInstance.list(sourcePath, { removePrefix: false });
        
        for (const item of items) {
            const itemZipPath = zipPath ? join(zipPath, basename(item)) : basename(item);
            
            // Skip the file being created to avoid circular reference
            if (excludePath && item === excludePath) {
                continue;
            }
            
            if (await storageInstance.isDirectory(item)) {
                // Recursively add subdirectories
                await this.addDirectoryToZip(zip, item, itemZipPath, excludePath);
            } else {
                // Add file to zip
                try {
                    const fileContent = await storageInstance.read(item);
                    zip.addFile(itemZipPath, Buffer.from(fileContent));
                } catch (error) {
                    // Skip files that can't be read
                    console.warn(`Skipping file ${item}: ${error}`);
                }
            }
        }
    }
}
