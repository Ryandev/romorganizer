import path from 'node:path';
import { log } from '../utils/logger';
import { Archive } from './interface';
import storage from '../utils/storage';
import storageDecorator from '../utils/storage.decorator';
import { IStorage } from '../utils/storage.interface';
import { EcmWasm } from '../../deps/ecm/wasm';
import { guardFileExists, guardDirectoryExists } from '../utils/guard';

async function _extract(filePath: string, ecmWasm: EcmWasm, storageInstance: IStorage & { cleanup: () => Promise<void> }): Promise<string> {
    guardFileExists(filePath, `file does not exist: ${filePath}`);

    const outputDirectory = await storageInstance.createTemporaryDirectory();
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
}

async function _verify(filePath: string, ecmWasm: EcmWasm, storageInstance: IStorage & { cleanup: () => Promise<void> }): Promise<boolean> {
    log.info(`Verifying ${filePath}...`);

    try {
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
}

async function _compress(contentsDirectory: string, ecmWasm: EcmWasm, storageInstance: IStorage & { cleanup: () => Promise<void> }): Promise<string> {
    guardDirectoryExists(
        contentsDirectory,
        `Contents directory does not exist: ${contentsDirectory}`
    );

    const outputDirectory = await storageInstance.createTemporaryDirectory();
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
}

/**
 * Creates an ECM archive handler that implements the Archive interface
 * @param filePath - Path to the ECM file
 * @returns An object implementing the Archive interface for ECM files with automatic cleanup
 */
export function createEcmArchive(filePath: string): Archive {
    const archive = {
        _storageInstance: storageDecorator.withCleanup(storage()),
        _ecmWasm: new EcmWasm(),
        
        archiveFile(): string {
            return filePath;
        },

        async extract(): Promise<string> {
            return _extract(filePath, this._ecmWasm, this._storageInstance);
        },

        async verify(): Promise<boolean> {
            return _verify(filePath, this._ecmWasm, this._storageInstance);
        },

        async compress(contentsDirectory: string): Promise<string> {
            return _compress(contentsDirectory, this._ecmWasm, this._storageInstance);
        },
    } as const;

    /* Add Symbol.dispose for automatic cleanup when the Archive object is destroyed */
    Object.defineProperty(archive, Symbol.dispose, {
        value: async () => {
            try {
                await archive._storageInstance.cleanup();
                log.info('ECM Archive cleanup completed');
            } catch (error) {
                log.warn(`ECM Archive cleanup failed: ${error}`);
            }
        },
        writable: false,
        enumerable: false,
        configurable: false,
    });

    return archive;
}
