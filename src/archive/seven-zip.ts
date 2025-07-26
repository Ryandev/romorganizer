import { $ } from 'zx';
import { log } from '../utils/logger.js';
import { BaseArchive } from './base.js';
import storage from '../utils/storage.js';

export class SevenZipArchive extends BaseArchive {
    constructor(filePath: string) {
        super(filePath);
    }

    async extract(): Promise<string> {
        this.validatePaths();

        const outputDir = await this.createTemporaryDirectory();
        try {
            log.info(`Extracting ${this.filePath} to ${outputDir}`);

            // Try different 7z command variations for cross-platform compatibility
            $`7z x "${this.filePath}" -o"${outputDir}" -y`
                .catch(() => $`7za x "${this.filePath}" -o"${outputDir}" -y`)
                .catch(() => $`p7zip -d "${this.filePath}" -o"${outputDir}"`)
                .catch(() => {
                    // If all fail, throw a helpful error
                    throw new Error(`7z extraction failed. Please ensure 7-Zip is installed:
              - Windows: Download from https://7-zip.org/
              - macOS: brew install p7zip
              - Linux: sudo apt install p7zip-full`);
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

            const result = (await $`7z t "${this.filePath}"`
                .then(() => true)
                .catch(() => $`7za t "${this.filePath}"`.then(() => true))
                .catch(() => $`p7zip -t "${this.filePath}"`.then(() => true))
                .catch(() => false)) as boolean;

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

            // Try different 7z command variations for cross-platform compatibility
            $`7z a "${this.filePath}" "${contentsDirectory}/*" -y`
                .catch(
                    () =>
                        $`7za a "${this.filePath}" "${contentsDirectory}/*" -y`
                )
                .catch(
                    () =>
                        $`p7zip -a "${this.filePath}" "${contentsDirectory}/*"`
                )
                .catch(() => {
                    // If all fail, throw a helpful error
                    throw new Error(`7z compression failed. Please ensure 7-Zip is installed:
              - Windows: Download from https://7-zip.org/
              - macOS: brew install p7zip
              - Linux: sudo apt install p7zip-full`);
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
