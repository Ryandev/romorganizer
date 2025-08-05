import path from 'node:path';
import { log } from '../utils/logger';
import { Archive } from './interface';
import storage from '../utils/storage';
import { EcmWasm } from '../../deps/ecm/wasm';
import { guardFileExists, guardDirectoryExists } from '../utils/guard';

/* Helper function to create temporary directory */
async function createTemporaryDirectory(): Promise<string> {
    const storageInstance = await storage();
    return await storageInstance.createTemporaryDirectory();
}

/**
 * Creates an ECM archive handler that implements the Archive interface
 * @param filePath - Path to the ECM file
 * @returns An object implementing the Archive interface for ECM files
 */
export function createEcmArchive(filePath: string): Archive {
    const ecmWasm = new EcmWasm();

    return {
        archiveFile(): string {
            return filePath;
        },

        async extract(): Promise<string> {
            guardFileExists(filePath, `file does not exist: ${filePath}`);

            const outputDirectory = await createTemporaryDirectory();
            const inputFileName = path.basename(filePath);
            const outputFileName = inputFileName.replace('.ecm', '');
            const outputFilePath = path.join(outputDirectory, outputFileName);

            try {
                await ecmWasm.extract(filePath, outputFilePath);
                guardFileExists(outputFilePath);
                log.info(`Extracted ${filePath} to ${outputFilePath}`);
                return outputFilePath;
            } catch (error) {
                throw new Error(
                    `ECM extraction failed: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        },

        async verify(): Promise<boolean> {
            guardFileExists(filePath, `file does not exist: ${filePath}`);
            log.info(`Verifying ${filePath}...`);

            try {
                const storageInstance = await storage();
                if (!(await storageInstance.exists(filePath))) {
                    log.warn(`✗ ${filePath} does not exist`);
                    return false;
                }

                /* Use WASM implementation to verify the ECM file */
                const isValid = await ecmWasm.verify(filePath);
                if (isValid) {
                    log.info(`✓ ${filePath} appears to be a valid ECM file`);
                } else {
                    log.warn(`✗ ${filePath} is not a valid ECM file`);
                }
                return isValid;
            } catch (error) {
                log.warn(`✗ ${filePath} is not accessible: ${error}`);
                return false;
            }
        },

        async compress(contentsDirectory: string): Promise<string> {
            guardDirectoryExists(
                contentsDirectory,
                `Contents directory does not exist: ${contentsDirectory}`
            );

            const outputDirectory = await createTemporaryDirectory();
            const inputFileName = path.basename(contentsDirectory);
            const outputFileName = `${inputFileName}.ecm`;
            const outputFilePath = path.join(outputDirectory, outputFileName);

            try {
                await ecmWasm.compress(contentsDirectory, outputFilePath);
                guardFileExists(outputFilePath);
                log.info(`Encoded ${contentsDirectory}`);
                return outputFilePath;
            } catch (error) {
                throw new Error(
                    `ECM compression failed: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        },
    };
}
