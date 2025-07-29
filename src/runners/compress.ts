import { log } from "../utils/logger";
import chd from "../utils/chd"
import { RarArchive } from "../archive/rar"
import { ZipArchive } from "../archive/zip"
import { EcmArchive } from "../archive/ecm";
import { SevenZipArchive } from "../archive/seven-zip"
import { guard, guardNotFalsy, guardValidString } from "../utils/guard";
import storage from "../utils/storage";
import { loadCuesheetFromFile } from "../utils/cuesheetLoader";
import path from "path";

export interface IRunner {
    start(): Promise<string[]>;
}

const _fileExtension = (filePath: string): string => {
    return filePath.split('.').pop() ?? '';
}

const EXTRACT_OPERATIONS = new Map<string, (sourceFile: string, allFiles: string[]) => Promise<string[]>>([
    ['ecm', async (sourceFile: string, allFiles: string[]) => {
        const ecmArchive = new EcmArchive(sourceFile);
        const extractedFile = await ecmArchive.extract();
        /* Find matching .cue file from .allFiles */
        for ( const file of allFiles.filter(file => file.endsWith('.cue'))) {
            /* load cue file */
            const cueFile = await loadCuesheetFromFile(file);
            /* find matching track */
            const cueFileMatches = `${cueFile.name}.bin` === path.basename(extractedFile);
            
            if (cueFileMatches) {
                /* create chd file */
                const cueFilePath = path.join(path.dirname(extractedFile), path.basename(extractedFile, '.bin') + '.cue');
                await storage().copy(file, cueFilePath);
                return [cueFilePath];
            }
        }

        return [extractedFile];
    }],
    ['7z', async (sourceFile: string) => {
        const extractedFile = await new SevenZipArchive(sourceFile).extract();
        const contents = await storage().list(extractedFile);
        return contents;
    }],
    ['chd', async (sourceFile: string) => {
        const extractedFile = await chd.extract({ chdFilePath: sourceFile, format: 'cue' });
        return [extractedFile];
    }],
    ['rar', async (sourceFile: string) => {
        const extractedFile = await new RarArchive(sourceFile).extract();
        const contents = await storage().list(extractedFile);
        return contents;
    }],
    ['zip', async (sourceFile: string) => {
        const outputDirectory = await new ZipArchive(sourceFile).extract();
        const contents = await storage().list(outputDirectory);
        return contents;
    }],
]);

const _extractOperation = async (sourceFile: string) => {
    const operation = EXTRACT_OPERATIONS.get(_fileExtension(sourceFile));
    guardNotFalsy(operation, `No matching operation found for ${sourceFile}`);
    return await operation(sourceFile);
}

const TO_CHD_OPERATIONS = new Map<string, (sourceFile: string) => Promise<string>>([
    ['cue', (sourceFile: string) => chd.create({ inputFilePath: sourceFile })],
    ['gdi', (sourceFile: string) => chd.create({ inputFilePath: sourceFile })],
    ['iso', (sourceFile: string) => chd.create({ inputFilePath: sourceFile })],
    ['img', (sourceFile: string) => chd.create({ inputFilePath: sourceFile })],
]);

const _toChdOperation = async (sourceFile: string) => {
    const operation = TO_CHD_OPERATIONS.get(_fileExtension(sourceFile));
    guardNotFalsy(operation, `No matching operation found for ${sourceFile}`);
    return await operation(sourceFile);
}

const _findMatchingFiles = (fileListings: string[], extension: string): string[] => {
    return fileListings.filter((file) => _fileExtension(file) === extension);
}

export class Runner implements IRunner {
    private readonly temporaryFiles: string[] = [];
    constructor(private readonly sourceFile: string) {
        this.sourceFile = sourceFile;
    }

    /* Cleanup the temporary files when the runner is disposed */
    async [Symbol.dispose]() {
        await this._cleanup();
    }

    private async _cleanup(): Promise<void> {
        for (const file of this.temporaryFiles) {
            await storage().remove(file).catch(() => {
                /* ignore errors */
            });
        }
    }

    private async _work(fileListings: string[]): Promise<string[]> {
        const matchingTargetExtensionFiles = _findMatchingFiles(fileListings, 'chd');

        if ( matchingTargetExtensionFiles.length > 0) {
            return matchingTargetExtensionFiles;
        }

        /* Attempt compression */
        const allCompressionResults = await Promise.all(fileListings.map(async (filePath) => {
            return await _toChdOperation(filePath).catch(() => {});
        }));
        const compressionResults = allCompressionResults.filter((result) => result !== undefined);

        if ( compressionResults.length > 0 ) {
            return compressionResults;
        }

        /* Attempt extraction */
        const allExtractionResults = await Promise.all(fileListings.map(async (filePath) => {
            return await _extractOperation(filePath).catch(() => {});
        }));
        const extractionResults = allExtractionResults.filter((result) => result !== undefined).flat()

        guard(extractionResults.length > 0, `No matching files found in ${fileListings.join(', ')} for ${this.sourceFile}`);

        /* Feed extraction results back into the work function */
        const operationResults = await this._work(extractionResults);

        return operationResults;
    }

    async start(): Promise<string[]> {
        /* check if the source matches the extension */
        if ( _fileExtension(this.sourceFile) === 'chd') {
            log.info(`Source file ${this.sourceFile} already matches the target extension ${'chd'}`);
            return [this.sourceFile];
        }

        try {
            const result = await this._work([this.sourceFile]);
            guardValidString(result);
            return result;
        } finally {
            await this._cleanup();
        }
    }
}

export default function createCHDRunner(sourceFile: string): IRunner|Error {
    const fileExtension = _fileExtension(sourceFile);
    const canOperateOnFile = TO_CHD_OPERATIONS.has(fileExtension) || EXTRACT_OPERATIONS.has(fileExtension);
    if (!canOperateOnFile) {
        return new Error(`No matching extensions found for ${sourceFile}`);
    }

    return new Runner(sourceFile);
} 