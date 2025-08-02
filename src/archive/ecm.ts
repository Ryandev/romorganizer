import { basename, join } from 'path';
import { log } from '../utils/logger';
import { BaseArchive } from './base';
import storage from '../utils/storage';
import { EcmWasm } from '../../deps/ecm/wasm';
import { guardFileExists } from '../utils/guard';

export class EcmArchive extends BaseArchive {
    private ecmWasm: EcmWasm;

    constructor(filePath: string) {
        super(filePath);
        this.ecmWasm = new EcmWasm();
    }

    async extract(): Promise<string> {
        guardFileExists(this.filePath);

        const outputDirectory = await this.createTemporaryDirectory();
        const inputFileName = basename(this.filePath);
        const outputFileName = inputFileName.replace('.ecm', '');
        const outputFilePath = join(outputDirectory, outputFileName);

        try {
            await this.ecmWasm.extract(this.filePath, outputFilePath);
            guardFileExists(outputFilePath);
            log.info(`Extracted ${this.filePath}`);
            return outputFilePath;
        } catch (error) {
            throw new Error(
                `ECM extraction failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    async verify(): Promise<boolean> {
        log.info(`Verifying ${this.filePath}...`);

        try {
            const storageInstance = await storage();
            if (!(await storageInstance.exists(this.filePath))) {
                log.warn(`✗ ${this.filePath} does not exist`);
                return false;
            }

            /* Use WASM implementation to verify the ECM file */
            const isValid = await this.ecmWasm.verify(this.filePath);
            if (isValid) {
                log.info(`✓ ${this.filePath} appears to be a valid ECM file`);
            } else {
                log.warn(`✗ ${this.filePath} is not a valid ECM file`);
            }
            return isValid;
        } catch (error) {
            log.warn(`✗ ${this.filePath} is not accessible: ${error}`);
            return false;
        }
    }

    async compress(filePath: string): Promise<string> {
        guardFileExists(filePath);

        const outputDirectory = await this.createTemporaryDirectory();
        const inputFileName = basename(filePath);
        const outputFileName = `${inputFileName}.ecm`;
        const outputFilePath = join(outputDirectory, outputFileName);

        try {
            await this.ecmWasm.compress(filePath, outputFilePath);
            guardFileExists(outputFilePath);
            log.info(`Encoded ${filePath}`);
            return outputFilePath;
        } catch (error) {
            throw new Error(
                `ECM compression failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}
