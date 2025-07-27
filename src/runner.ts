import { log } from "./utils/logger";
import chd from "./utils/chd"
import { RarArchive } from "./archive/rar"
import { ZipArchive } from "./archive/zip"
// import { EcmArchive } from "./archive/ecm"
import { SevenZipArchive } from "./archive/seven-zip"
import { guardNotFalsy, guardValidString } from "./utils/guard";
import { EcmArchive } from "./archive/ecm";
import storage from "./utils/storage";

export interface IRunner {
    start(): Promise<string[]>;
}

const _fileExtension = (filePath: string): string => {
    return filePath.split('.').pop() ?? '';
}

const EXTRACT_OPERATIONS = new Map<string, (sourceFile: string) => Promise<string>>([
    ['ecm', (sourceFile: string) => new EcmArchive(sourceFile).extract()],
    ['7z', (sourceFile: string) => new SevenZipArchive(sourceFile).extract()],
    ['chd', chd.extract],
    ['rar', (sourceFile: string) => new RarArchive(sourceFile).extract()],
    ['zip', (sourceFile: string) => new ZipArchive(sourceFile).extract()]
]);

const TO_CHD_OPERATIONS = new Map<string, (sourceFile: string) => Promise<string>>([
    ['cue', (sourceFile: string) => chd.create({ inputFilePath: sourceFile })],
    ['gdi', (sourceFile: string) => chd.create({ inputFilePath: sourceFile })],
    ['iso', (sourceFile: string) => chd.create({ inputFilePath: sourceFile })],
    ['img', (sourceFile: string) => chd.create({ inputFilePath: sourceFile })],
]);

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

        for ( const filePath of fileListings) {
            const canCreate = chd.canCreateChdFile(filePath);
            if (canCreate) {
                return [await chd.create({ inputFilePath: filePath })];
            }
        }

        for ( const filePath of fileListings) {
            const canExtract = EXTRACT_OPERATIONS.has(_fileExtension(filePath));
            if (canExtract) {
                const operation = EXTRACT_OPERATIONS.get(_fileExtension(filePath));
                guardNotFalsy(operation, `No matching operation found for ${filePath}`);
                const extractedFile = await operation(filePath);
                guardNotFalsy(extractedFile, `Extraction operation failed for ${filePath}`);
                return [extractedFile];
            }
        }

        throw new Error(`No matching files found in ${fileListings.join(', ')} for ${this.sourceFile}`);
    }

    async start(): Promise<string> {
        /* check if the source matches the extension */
        if ( _fileExtension(this.sourceFile) === 'chd') {
            log.info(`Source file ${this.sourceFile} already matches the target extension ${'chd'}`);
            return this.sourceFile;
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



export default function createRunner(sourceFile: string): IRunner|Error {
    const fileExtension = _fileExtension(sourceFile);
    const canOperateOnFile = TO_CHD_OPERATIONS.has(fileExtension) || EXTRACT_OPERATIONS.has(fileExtension);
    if (!canOperateOnFile) {
        return new Error(`No matching extensions found for ${sourceFile}`);
    }

    return new Runner(sourceFile);
}