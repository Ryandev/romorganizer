import { basename, join } from 'path';
import { $ } from 'zx';
import { log } from '../utils/logger.js';
import { BaseArchive } from './base.js';
import storage from '../utils/storage.js';


export class EcmArchive extends BaseArchive {
    constructor(filePath: string) {
        super(filePath);
        // Note: checkCommand is now async but constructors can't be async
        // We'll check commands when needed instead
    }

    async extract(): Promise<string> {
        await this.checkCommand(
            'unecm',
            'see project: https://github.com/kidoz/ecm'
        );
        this.validatePaths();

        const outputDir = await this.createTemporaryDirectory();
        try {
            const storageInstance = await storage();
            const fileName = basename(this.filePath);
            const extractFile = join(outputDir, fileName);
            await storageInstance.copy(this.filePath, extractFile);

            const originalCwd = process.cwd();
            process.chdir(outputDir);
            log.info(`Extracting ${extractFile}`);
            await $`unecm "${extractFile}"`;
            log.info(`Removing ${extractFile}`);
            await storageInstance.remove(extractFile);
            log.info(`Done extracting ${this.filePath} to ${outputDir}`);
            process.chdir(originalCwd);

            await this.moveContentsFromSubdirectories(outputDir);
            return outputDir;
        } catch (error) {
            abort(
                `Failed to extract ${this.filePath} to ${outputDir}: ${error}`
            );
        }
    }

    async verify(): Promise<boolean> {
        log.info(`Verifying ${this.filePath}...`);
        // ECM files don't have a built-in verification command, so we'll do a basic file check
        try {
            const storageInstance = await storage();
            if (!(await storageInstance.exists(this.filePath))) {
                log.warn(`✗ ${this.filePath} does not exist`);
                return false;
            }

            // Try to read the first few bytes to check if file is accessible
            const fd = require('fs').openSync(this.filePath, 'r');
            const buffer = Buffer.alloc(4);
            require('fs').readSync(fd, buffer, 0, 4, 0);
            require('fs').closeSync(fd);

            log.info(`✓ ${this.filePath} appears to be accessible`);
            return true;
        } catch (error) {
            log.warn(`✗ ${this.filePath} is not accessible: ${error}`);
            return false;
        }
    }

    async compress(contentsDirectory: string): Promise<string> {
        await this.checkCommand(
            'ecm',
            'see project: https://github.com/kidoz/ecm'
        );
        this.validateCompressPaths(contentsDirectory);

        try {
            log.info(`Compressing ${contentsDirectory} to ${this.filePath}`);

            // ECM compression typically works on single files, so we'll compress the first file found
            const storageInstance = await storage();
            const allFiles = await storageInstance.list(contentsDirectory, {
                recursive: false,
            });
            const filesWithChecks = await Promise.all(
                allFiles.map(async (item: string) => ({
                    path: item,
                    name: item.split('/').pop() || item,
                    isFile: await storageInstance.isFile(item),
                }))
            );

            const files = filesWithChecks.filter(
                (item: { path: string; name: string; isFile: boolean }) =>
                    item.isFile && !item.name.startsWith('.')
            );

            if (files.length === 0) {
                abort(`No files found in ${contentsDirectory} to compress`);
            }

            const firstFile = files.at(0)?.path;
            if (!firstFile) {
                abort(`No files found in ${contentsDirectory} to compress`);
            }
            await $`ecm "${firstFile}" "${this.filePath}"`;

            log.info(
                `✓ Successfully compressed ${firstFile} to ${this.filePath}`
            );
            return this.filePath;
        } catch (error) {
            abort(
                `Failed to compress ${contentsDirectory} to ${this.filePath}: ${error}`
            );
        }
    }
}
