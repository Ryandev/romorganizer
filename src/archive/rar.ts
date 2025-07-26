import { $ } from 'zx';
import { log } from '../utils/logger.js';
import { BaseArchive } from './base.js';
import storage from '../utils/storage.js';

export class RarArchive extends BaseArchive {
    constructor(filePath: string) {
        super(filePath);
    }

    async extract(): Promise<string> {
        this.validatePaths();

        const outputDir = await this.createTemporaryDirectory();
        try {
            log.info(`Extracting ${this.filePath} to ${outputDir}`);

            // Try different unrar command variations for cross-platform compatibility
            $`unrar x "${this.filePath}" "${outputDir}"`
                .catch(() => $`unrar-free x "${this.filePath}" "${outputDir}"`)
                .catch(() => $`rar x "${this.filePath}" "${outputDir}"`)
                .catch(() => {
                    // If all fail, throw a helpful error
                    throw new Error(`RAR extraction failed. Please ensure unrar is installed:
            - Windows: Download from https://www.win-rar.com/
            - macOS: brew install unrar
            - Linux: sudo apt install unrar`);
                });

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

            const result = (await $`unrar t "${this.filePath}"`
                .then(() => true)
                .catch(() =>
                    $`unrar-free t "${this.filePath}"`.then(() => true)
                )
                .catch(() => $`rar t "${this.filePath}"`.then(() => true))
                .catch(() => false)) as boolean;

            if (result) {
                log.info(`✓ ${this.filePath} is valid`);
            } else {
                log.warn(`✗ ${this.filePath} is corrupted or invalid`);
            }

            return result;
        } catch (error) {
            log.warn(`✗ ${this.filePath} is corrupted or invalid: ${error}`);
            return false;
        }
    }

    async compress(contentsDirectory: string): Promise<string> {
        this.validateCompressPaths(contentsDirectory);

        try {
            log.info(`Compressing ${contentsDirectory} to ${this.filePath}`);

            // Try different rar command variations for cross-platform compatibility
            $`rar a "${this.filePath}" "${contentsDirectory}/*"`
                .catch(
                    () =>
                        $`winrar a "${this.filePath}" "${contentsDirectory}/*"`
                )
                .catch(() => {
                    // If all fail, throw a helpful error
                    throw new Error(`RAR compression failed. Please ensure rar is installed:
            - Windows: Download WinRAR from https://www.win-rar.com/
            - macOS: brew install rar
            - Linux: sudo apt install rar`);
                });

            log.info(`✓ Successfully compressed to ${this.filePath}`);
            return this.filePath;
        } catch (error) {
            abort(
                `Failed to compress ${contentsDirectory} to ${this.filePath}: ${error}`
            );
        }
    }
}
