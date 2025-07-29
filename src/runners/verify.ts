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
import { Dat, ROM } from "../utils/dat";
import { CuesheetEntry } from "../utils/cuesheetLoader";

export interface IRunner {
    start(): Promise<string[]>;
}

const _fileExtension = (filePath: string): string => {
    return filePath.split('.').pop() ?? '';
}

const EXTRACT_OPERATIONS = new Map<string, (sourceFile: string, allFiles?: string[]) => Promise<string[]>>([
    ['ecm', async (sourceFile: string, allFiles?: string[]) => {
        const ecmArchive = new EcmArchive(sourceFile);
        const extractedFile = await ecmArchive.extract();
        /* Find matching .cue file from .allFiles */
        if (allFiles) {
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

const _extractOperation = async (sourceFile: string, allFiles?: string[]) => {
    const operation = EXTRACT_OPERATIONS.get(_fileExtension(sourceFile));
    guardNotFalsy(operation, `No matching operation found for ${sourceFile}`);
    return await operation(sourceFile, allFiles);
}

// Removed unused function _findMatchingFiles

const _findMatchingRom = (dat: Dat, fileName: string): ROM | undefined => {
    for (const game of dat.games) {
        const matchingRom = game.roms.find((rom) => rom.name === fileName);
        if (matchingRom) {
            return matchingRom;
        }
    }
    return undefined;
}

const _verifyFile = async (filePath: string, dat: Dat): Promise<boolean> => {
    const fileName = path.basename(filePath);
    const matchingRom = _findMatchingRom(dat, fileName);
    
    if (!matchingRom) {
        log.warn(`No matching ROM found for ${fileName}`);
        return false;
    }

    /* Verify file size */
    const fileSize = await storage().size(filePath);
    if (fileSize !== matchingRom.size) {
        log.warn(`File size mismatch for ${fileName}: expected ${matchingRom.size}, got ${fileSize}`);
        return false;
    }

    /* Note: CRC verification is not implemented yet - would need CRC32 utility function */
    if (matchingRom.crc) {
        log.info(`CRC verification skipped for ${fileName} - not implemented`);
    }

    log.info(`File ${fileName} verified successfully`);
    return true;
}

export class Runner implements IRunner {
    private readonly temporaryFiles: string[] = [];
    constructor(
        private readonly sourceFile: string,
        private readonly dat: Dat,
        private readonly cuesheetEntries: CuesheetEntry[]
    ) {
        this.sourceFile = sourceFile;
        this.dat = dat;
        this.cuesheetEntries = cuesheetEntries;
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
        const verificationResults = await Promise.all(fileListings.map(async (filePath) => {
            const isValid = await _verifyFile(filePath, this.dat);
            return isValid ? filePath : undefined;
        }));

        const validFiles = verificationResults.filter((result) => result !== undefined) as string[];

        if (validFiles.length > 0) {
            return validFiles;
        }

        /* Attempt extraction for invalid files */
        const relatedFiles = await storage().list(path.dirname(this.sourceFile));
        const allExtractionResults = await Promise.all(fileListings.map(async (filePath) => {
            return await _extractOperation(filePath, relatedFiles).catch(() => {});
        }));
        const extractionResults = allExtractionResults.filter((result) => result !== undefined).flat()

        guard(extractionResults.length > 0, `No matching files found in ${fileListings.join(', ')} for ${this.sourceFile}`);

        /* Feed extraction results back into the work function */
        const operationResults = await this._work(extractionResults);

        return operationResults;
    }

    async start(): Promise<string[]> {
        try {
            const result = await this._work([this.sourceFile]);
            guardValidString(result);
            return result;
        } finally {
            await this._cleanup();
        }
    }
}

export default function createVerifyRunner(sourceFile: string, dat: Dat, cuesheetEntries: CuesheetEntry[]): IRunner | Error {
    const fileExtension = _fileExtension(sourceFile);
    const canOperateOnFile = EXTRACT_OPERATIONS.has(fileExtension);
    if (!canOperateOnFile) {
        return new Error(`No matching extensions found for ${sourceFile}`);
    }

    return new Runner(sourceFile, dat, cuesheetEntries);
} 