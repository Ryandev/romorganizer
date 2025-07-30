import { log } from "../utils/logger";
import chd from "../utils/chd"
import { RarArchive } from "../archive/rar"
import { ZipArchive } from "../archive/zip"
import { EcmArchive } from "../archive/ecm";
import { SevenZipArchive } from "../archive/seven-zip"
import { guard, guardFileExists, guardValidString } from "../utils/guard";
import storage from "../utils/storage";
import { loadCuesheetFromFile } from "../utils/cuesheetLoader";
import path from "path";
import cueSheet from "../utils/cueSheet";



export interface IRunner {
    start(): Promise<string[]>;
}

const _fileExtension = (filePath: string): string => {
    return filePath.split('.').pop() ?? '';
}

const EXTRACT_OPERATIONS = new Map<string, (sourceFile: string, allFiles?: string[]) => Promise<string[]>>([
    ['ecm', async (sourceFile: string, allFiles: string[] = []) => {
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

        /* If no matching .cue file is found, return the extracted file */
        return [extractedFile];
    }],
    ['7z', async (sourceFile: string) => {
        if ( !sourceFile.endsWith('.7z')) {
            return [];
        }
        const extractedFile = await new SevenZipArchive(sourceFile).extract();
        const contents = await storage().list(extractedFile);
        return contents;
    }],
    ['chd', async (sourceFile: string) => {
        if ( !sourceFile.endsWith('.chd')) {
            return [];
        }
        const extractedFile = await chd.extract({ chdFilePath: sourceFile, format: 'cue' });
        return [extractedFile];
    }],
    ['rar', async (sourceFile: string) => {
        if ( !sourceFile.endsWith('.rar')) {
            return [];
        }
        const extractedDirectory = await new RarArchive(sourceFile).extract();
        const contents = await storage().list(extractedDirectory);
        return contents;
    }],
    ['zip', async (sourceFile: string) => {
        if ( !sourceFile.endsWith('.zip')) {
            return [];
        }
        const outputDirectory = await new ZipArchive(sourceFile).extract();
        const contents = await storage().list(outputDirectory);
        return contents;
    }],
    ['ccd', async (sourceFile: string) => {
        if ( !sourceFile.endsWith('.ccd')) {
            return [];
        }
        /* Convert CCD to CUE */
        const cueContent = await cueSheet.parseFromCCDFile(sourceFile);
        const baseName = path.basename(sourceFile, '.ccd');
        const cueFilePath = path.join(path.dirname(sourceFile), `${baseName}.cue`);
        const storageInstance = await storage();
        await storageInstance.write(cueFilePath, new TextEncoder().encode(cueContent));
        return [cueFilePath];
    }],
    // ['img', async (sourceFile: string) => {
    //     if ( !sourceFile.endsWith('.img')) {
    //         return [];
    //     }
    //     /* rename IMG to BIN */
    //     const binFileName = path.basename(sourceFile, '.img') + '.bin'
    //     const binFilePath = path.join(path.dirname(sourceFile), binFileName);
    //     await storage().move(sourceFile, binFilePath);
    //     guardFileExists(binFilePath);
    //     return [binFilePath];
    // }]
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
        /* First, check if we already have CHD files */
        const matchingTargetExtensionFiles = _findMatchingFiles(fileListings, 'chd');
        if (matchingTargetExtensionFiles.length > 0) {
            return matchingTargetExtensionFiles;
        }

        /* Keep extracting until no more extraction is possible */
        let currentFiles = [...fileListings];
        let extractionOccurred = true;
        
        while (extractionOccurred) {
            extractionOccurred = false;
            const extractionResults: string[] = [];
            
            /* Try to extract each file */
            for (const filePath of currentFiles) {
                try {
                    const extension = _fileExtension(filePath);
                    const extractOperation = EXTRACT_OPERATIONS.get(extension);
                    
                    if (extractOperation) {
                        const extractedFiles = await extractOperation(filePath, currentFiles);
                        extractionResults.push(...extractedFiles);
                        extractionOccurred = true;
                    } else {
                        /* Keep files that can't be extracted */
                        extractionResults.push(filePath);
                    }
                } catch (error) {
                    log.warn(`Failed to extract file ${filePath}: ${error}`);
                    /* Keep files that fail to extract */
                    extractionResults.push(filePath);
                }
            }
            
            currentFiles = extractionResults;
        }

        /* Now attempt compression on the remaining files */
        const compressionResults: string[] = [];
        
        for (const filePath of currentFiles) {
            try {
                const extension = _fileExtension(filePath);
                
                /* Only compress files that can be converted to CHD */
                if (['cue', 'gdi'].includes(extension)) {
                    const chdResult = await chd.create({ inputFilePath: filePath });
                    if (chdResult) {
                        compressionResults.push(chdResult);
                    }
                }
            } catch (error) {
                log.warn(`Failed to compress file ${filePath}: ${error}`);
            }
        }

        /* If we have compression results, return them */
        if (compressionResults.length > 0) {
            return compressionResults;
        }

        /* If no compression occurred and no extraction occurred, we're stuck */
        guard(currentFiles.length > 0, `No matching files found in ${fileListings.join(', ')} for ${this.sourceFile}`);
        
        /* Return the remaining files that couldn't be processed */
        return currentFiles;
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
    const supportedExtensions = ['cue', 'gdi', 'iso', 'ccd', 'img', 'ecm', '7z', 'chd', 'rar', 'zip'];
    const canOperateOnFile = supportedExtensions.includes(fileExtension);
    if (!canOperateOnFile) {
        return new Error(`No matching extensions found for ${sourceFile}`);
    }

    return new Runner(sourceFile);
} 