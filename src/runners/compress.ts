import { log } from '../utils/logger';
import chd from '../utils/chd';
import { createArchive } from '../archive';
import * as mdf from '../utils/mdf';
import { guard, guardFileExists } from '../utils/guard';
import storage from '../utils/storage';
import { loadCuesheetFromFile } from '../utils/cuesheet-loader';
import path from 'node:path';
import cueSheet from '../utils/cue-sheet';
import iso from '../utils/iso';
import { IStorage } from '../utils/storage.interface';
import storageDecorator from '../utils/storage.decorator';
import { IRunner } from './interface';
import { setTemporaryDirectory } from '../utils/environment';
import { fileExtension, groupedFiles } from './utils';

const EXTRACT_OPERATIONS = new Map<
    string,
    (sourceFile: string, allFiles?: string[]) => Promise<string[]>
>([
    [
        'ecm',
        async (sourceFile: string, allFiles: string[] = []) => {
            const ecmArchive = createArchive(sourceFile);
            const extractedFile = await ecmArchive.extract();
            /* Find matching .cue file from .allFiles */
            for (const file of allFiles.filter(file => file.endsWith('.cue'))) {
                /* load cue file */
                const cueFile = await loadCuesheetFromFile(file);
                /* find matching track */
                const cueFileMatches =
                    `${cueFile.name}.bin` === path.basename(extractedFile);

                if (cueFileMatches) {
                    /* create chd file */
                    const cueFilePath = path.join(
                        path.dirname(extractedFile),
                        path.basename(extractedFile, '.bin') + '.cue'
                    );
                    await storage().copy(file, cueFilePath);
                    return [cueFilePath];
                }
            }

            /* If no matching .cue file is found, return the extracted file */
            return [extractedFile];
        },
    ],
    [
        '7z',
        async (sourceFile: string) => {
            if (!sourceFile.endsWith('.7z')) {
                return [];
            }
            const extractedFile = await createArchive(sourceFile).extract();
            const contents = await storage().list(extractedFile);
            return contents;
        },
    ],
    [
        'chd',
        async (sourceFile: string) => {
            if (!sourceFile.endsWith('.chd')) {
                return [];
            }
            const extractedFile = await chd.extract({
                chdFilePath: sourceFile,
                format: 'cue',
            });
            return [extractedFile];
        },
    ],
    [
        'rar',
        async (sourceFile: string) => {
            if (!sourceFile.endsWith('.rar')) {
                return [];
            }
            const extractedDirectory = await createArchive(sourceFile).extract();
            const contents = await storage().list(extractedDirectory);
            return contents;
        },
    ],
    [
        'zip',
        async (sourceFile: string) => {
            if (!sourceFile.endsWith('.zip')) {
                return [];
            }
            const outputDirectory = await createArchive(sourceFile).extract();
            const contents = await storage().list(outputDirectory);
            return contents;
        },
    ],
    [
        'ccd',
        async (sourceFile: string) => {
            if (!sourceFile.endsWith('.ccd')) {
                return [];
            }
            /* Convert CCD to CUE */
            const cueContent = await cueSheet.parseFromCCDFile(sourceFile);
            const baseName = path.basename(sourceFile, '.ccd');
            const cueFilePath = path.join(
                path.dirname(sourceFile),
                `${baseName}.cue`
            );
            const storageInstance = await storage();
            await storageInstance.write(
                cueFilePath,
                new TextEncoder().encode(cueContent)
            );
            return [cueFilePath];
        },
    ],
    [
        'mdf',
        async (sourceFile: string) => {
            if (!sourceFile.endsWith('.mdf')) {
                return [];
            }
            /* Convert MDF to ISO first, then extract ISO to get BIN/CUE */
            const isoFile = await mdf.convertToIso(sourceFile);
            return [isoFile];
        },
    ],
    [
        'iso',
        async (sourceFile: string) => {
            if (!sourceFile.endsWith('.iso')) {
                return [];
            }
            /* Convert ISO to bin/cue using poweriso */
            const binFile = await iso.convert(sourceFile, 'bin');
            /* Generate CUE file */
            const cueFilePath = path.join(
                path.dirname(binFile),
                `${path.basename(binFile, '.bin')}.cue`
            );
            await cueSheet.createCueFile(binFile, cueFilePath);
            guardFileExists(
                binFile,
                `Bin file missing, does not exist: ${binFile}`
            );
            guardFileExists(
                cueFilePath,
                `CUE file missing, does not exist: ${cueFilePath}`
            );
            return [binFile, cueFilePath];
        },
    ],
    [
        'nrg',
        async (sourceFile: string) => {
            if (!sourceFile.endsWith('.nrg')) {
                return [];
            }
            /* Convert ISO to bin/cue using poweriso */
            const binFile = await iso.convert(sourceFile, 'bin');
            return [binFile];
        },
    ],
]);

const _findMatchingFiles = (
    fileListings: string[],
    extension: string
): string[] => {
    return fileListings.filter(file => fileExtension(file) === extension);
};

export class RunnerFile implements IRunner<string[]> {
    private readonly storage: IStorage;

    constructor(
        private readonly sourceFiles: string[],
        private readonly overwrite: boolean,
    ) {
        this.sourceFiles = sourceFiles;
        this.overwrite = overwrite;
        /* Decorate storage to automatically cleanup temporary files when the runner is disposed */
        this.storage = storageDecorator.withCleanup(storage());
    }

    /* Extract all files that can be extracted into the same directory */
    private async _performAllExtractionOperations(
        workingDirectory: string
    ): Promise<string[]> {
        const fileListings = await this.storage.list(workingDirectory);
        /* Keep extracting until no more extraction is possible */
        const currentFiles = [...fileListings];
        let extractionOccurred = true;

        while (extractionOccurred) {
            extractionOccurred = false;

            /* Try to extract each file */
            for (const filePath of currentFiles) {
                try {
                    const extension = fileExtension(filePath);
                    const extractOperation = EXTRACT_OPERATIONS.get(
                        extension.toLowerCase()
                    );

                    if (!extractOperation) {
                        continue;
                    }

                    const extractedFiles = await extractOperation(
                        filePath,
                        currentFiles
                    );
                    /* Move extracted files back to current directory */
                    for (const extractedFile of extractedFiles) {
                        const newFilePath = path.join(
                            workingDirectory,
                            path.basename(extractedFile)
                        );
                        await this.storage.move(extractedFile, newFilePath);
                        currentFiles.push(newFilePath);
                    }
                    /* Make sure we don't try to extract the same file again */
                    currentFiles.splice(currentFiles.indexOf(filePath), 1);

                    extractionOccurred = true;
                } catch (error) {
                    log.warn(`Failed to extract file ${filePath}: ${error}`);
                }
            }
        }

        /* Re-grab all the files in the working directory */
        return await this.storage.list(workingDirectory);
    }

    async start(): Promise<string[]> {
        const outputFile = `${path.basename(this.sourceFiles[0] ?? '')}.chd`;
        const outputDirectory = path.dirname(this.sourceFiles[0] ?? '');
        const outputFilePath = path.join(outputDirectory, outputFile);
        if (await storage().exists(outputFilePath) && !this.overwrite) {
            throw new Error(`Output file already exists: ${outputFilePath}`);
        }

        const workingDirectory = await this.storage.createTemporaryDirectory();
        for (const sourceFile of this.sourceFiles) {
            const destinationFile = path.join(
                workingDirectory,
                path.basename(sourceFile)
            );
            await this.storage.copy(sourceFile, destinationFile);
        }
        const currentFiles =
            await this._performAllExtractionOperations(workingDirectory);

        /* Now attempt compression on the remaining files */
        const compressionResults: string[] = [];

        for (const filePath of currentFiles) {
            try {
                const extension = fileExtension(filePath);

                /* Only compress files that can be converted to CHD */
                if (['cue', 'gdi'].includes(extension)) {
                    const chdResult = await chd.create({
                        inputFilePath: filePath,
                    });
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
        guard(
            currentFiles.length > 0,
            `No matching files found in ${currentFiles.join(', ')} for ${this.sourceFiles.join(', ')}`
        );

        /* First, check if we already have CHD files */
        const matchingTargetExtensionFiles = _findMatchingFiles(
            currentFiles,
            'chd'
        );
        if (matchingTargetExtensionFiles.length > 0) {
            return matchingTargetExtensionFiles;
        }

        /* Return the remaining files that couldn't be processed */
        return currentFiles;
    }
}

export class RunnerDirectory implements IRunner<string[]> {
    constructor(
        private readonly sourceDir: string,
        private readonly outputDir: string,
        private readonly tempDir: string | undefined,
        private readonly overwrite: boolean,
        private readonly removeSource: boolean,
    ) {
        this.sourceDir = sourceDir;
        this.outputDir = outputDir;
        this.tempDir = tempDir ?? undefined;
        this.overwrite = overwrite;
        this.removeSource = removeSource;
    }

    private _createRunner(
        sourceFiles: string[],
        overwrite: boolean
    ): RunnerFile | Error {
        const fileExtensions = new Set(
            sourceFiles.map(file => fileExtension(file).toLowerCase())
        );
        const supportedExtensions = new Set(
            [...EXTRACT_OPERATIONS.keys()].map(ext => ext.toLowerCase())
        );
        const compressibleExtensions = new Set([
            'cue',
            'gdi',
        ]); /* Files that can be directly compressed to CHD */
    
        /* Check if any file can be extracted or directly compressed */
        const canExtract = [...supportedExtensions].some(extension =>
            fileExtensions.has(extension)
        );
        const canCompress = [...compressibleExtensions].some(extension =>
            fileExtensions.has(extension)
        );
    
        if (!canExtract && !canCompress) {
            return new Error(
                `No matching extensions found for ${sourceFiles.join(', ')}`
            );
        }
   
        return new RunnerFile(sourceFiles, overwrite);
    }
    

    async start(): Promise<string[]> {
        if (this.tempDir) {
            setTemporaryDirectory(this.tempDir);
        }
                    
            const outputFiles: string[] = [];
            const fileGroups = await groupedFiles(this.sourceDir);
            log.info(`Found ${fileGroups.length} files in source directory`);
        
            for (const files of fileGroups) {
                const runner = this._createRunner(files, this.overwrite);
                if (runner instanceof Error) {
                    log.error(`Error creating runner for ${files}: ${runner.message}`);
                    continue;
                }

                const outputFilePaths = await runner.start();
                const chdFilePaths = outputFilePaths.filter(filePath => filePath.endsWith('.chd'));

                for ( const chdFilePath of chdFilePaths ) {
                    const outputFileName = path.basename(chdFilePath);
                    const outputPath = path.join(this.outputDir, outputFileName);
                    const outputPathExists = await storage().exists(outputPath);
        
                    if (outputPathExists && !this.overwrite) {
                        log.info(
                            `Skipping ${files} - output file already exists in output directory`
                        );
                        continue;
                    }

                    await storage().move(chdFilePath, outputPath);
                    outputFiles.push(outputPath);

                    if (this.removeSource) {
                        await Promise.all(files.map(file => storage().remove(file)));
                        log.info(`Removed source files: ${files.join(', ')}`);
                    }    
                }
            }
        
            return outputFiles;
    }
}