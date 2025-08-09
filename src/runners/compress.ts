import { log } from '../utils/logger';
import chd from '../utils/chd';
import { createArchive } from '../archive';
import * as mdf from '../utils/mdf';
import { guard, guardDirectoryExists, guardFileExists } from '../utils/guard';
import storage from '../utils/storage';
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
    (sourceFile: string, allFiles: string[]) => Promise<string[]>
>([
    [
        'ecm',
        async (sourceFile: string, allFiles: string[]) => {
            const ecmArchive = createArchive(sourceFile);
            let extractedFile = await ecmArchive.extract();
            const extractedFileExtension = fileExtension(extractedFile);
            guardFileExists(
                extractedFile,
                `Extracted file missing, does not exist: ${extractedFile}`
            );
            const cueFile = allFiles.find(file =>
                file.toLowerCase().endsWith('.cue')
            );
            if (cueFile) {
                /* Read the cue file & get the name of the expected bin/img/etc (look based on the extractedFileExtension) file. */
                /* If the bin filename does not match the cue file. Rename the bin file before returning */
                const cueContent = await cueSheet.parseFromCueFile(cueFile);
                const cueData = await cueSheet.deserializeCueSheet(cueContent);
                const trackFileName = cueData.files
                    .map(file => file.filename)
                    .find(filename =>
                        filename.toLowerCase().endsWith(extractedFileExtension)
                    );
                log.info(
                    `Found cue file ${cueFile} & data file ${trackFileName}`
                );
                if (trackFileName) {
                    const trackFilePath = path.join(
                        path.dirname(cueFile),
                        trackFileName
                    );
                    if (trackFilePath !== extractedFile) {
                        log.info(
                            `Renaming extracted ecm file ${extractedFile} to ${trackFilePath}`
                        );
                        await storage().move(extractedFile, trackFilePath);
                        extractedFile = trackFilePath;
                    }
                }
            }
            return [extractedFile];
        },
    ],
    [
        '7z',
        async (sourceFile: string) => {
            if (!sourceFile.toLowerCase().endsWith('.7z')) {
                return [];
            }
            const extractedDirectory =
                await createArchive(sourceFile).extract();
            guardDirectoryExists(
                extractedDirectory,
                `Extracted directory missing, does not exist: ${extractedDirectory}`
            );
            const contents = await storage().list(extractedDirectory, {
                recursive: true,
                avoidHiddenFiles: true,
                includeDirectories: false,
            });
            guard(
                contents.length > 0,
                `No files found in extracted directory: ${extractedDirectory}`
            );
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
            guardFileExists(
                extractedFile,
                `Extracted file missing, does not exist: ${extractedFile}`
            );
            return [extractedFile];
        },
    ],
    [
        'rar',
        async (sourceFile: string) => {
            if (!sourceFile.toLowerCase().endsWith('.rar')) {
                return [];
            }
            const extractedDirectory =
                await createArchive(sourceFile).extract();
            guardDirectoryExists(
                extractedDirectory,
                `Extracted directory missing, does not exist: ${extractedDirectory}`
            );
            const contents = await storage().list(extractedDirectory, {
                recursive: true,
                avoidHiddenFiles: true,
                includeDirectories: false,
            });
            guard(
                contents.length > 0,
                `No files found in extracted directory: ${extractedDirectory}`
            );
            return contents;
        },
    ],
    [
        'zip',
        async (sourceFile: string) => {
            if (!sourceFile.toLowerCase().endsWith('.zip')) {
                return [];
            }
            const outputDirectory = await createArchive(sourceFile).extract();
            guardDirectoryExists(
                outputDirectory,
                `Output directory missing, does not exist: ${outputDirectory}`
            );
            const contents = await storage().list(outputDirectory, {
                recursive: true,
                avoidHiddenFiles: true,
                includeDirectories: false,
            });
            guard(
                contents.length > 0,
                `No files found in extracted directory: ${outputDirectory}`
            );
            return contents;
        },
    ],
    [
        'ccd',
        async (sourceFile: string) => {
            if (!sourceFile.toLowerCase().endsWith('.ccd')) {
                return [];
            }
            /* Convert CCD to CUE */
            const cueContent = await cueSheet.parseFromCCDFile(sourceFile);
            const fileNameNoExtension = path.basename(sourceFile, path.extname(sourceFile));
            const cueFilePath = path.join(
                path.dirname(sourceFile),
                `${fileNameNoExtension}.cue`
            );
            const storageInstance = await storage();
            await storageInstance.write(
                cueFilePath,
                new TextEncoder().encode(cueContent)
            );
            guardFileExists(
                cueFilePath,
                `CUE file missing, does not exist: ${cueFilePath}`
            );
            return [cueFilePath];
        },
    ],
    [
        'mdf',
        async (sourceFile: string) => {
            if (!sourceFile.toLowerCase().endsWith('.mdf')) {
                return [];
            }
            /* Convert MDF to ISO first, then extract ISO to get BIN/CUE */
            const isoFile = await mdf.convertToIso(sourceFile);
            guardFileExists(
                isoFile,
                `ISO file missing, does not exist: ${isoFile}`
            );
            return [isoFile];
        },
    ],
    [
        'iso',
        async (sourceFile: string) => {
            if (!sourceFile.toLowerCase().endsWith('.iso')) {
                return [];
            }
            /* Convert ISO to bin/cue using poweriso */
            const binFile = await iso.convert(sourceFile, 'bin');
            const binFileNoExtension = path.basename(binFile, path.extname(binFile));
            /* Generate CUE file */
            const cueFilePath = path.join(
                path.dirname(binFile),
                `${binFileNoExtension}.cue`
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
            if (!sourceFile.toLowerCase().endsWith('.nrg')) {
                return [];
            }
            /* Convert ISO to bin/cue using poweriso */
            const binFile = await iso.convert(sourceFile, 'bin');
            guardFileExists(
                binFile,
                `Bin file missing, does not exist: ${binFile}`
            );
            return [binFile];
        },
    ],
    [
        'img',
        async (sourceFile: string) => {
            if (!sourceFile.toLowerCase().endsWith('.img')) {
                return [];
            }
            const temporaryDirectory = await storage().createTemporaryDirectory();
            const fileNameNoExtension = path.basename(sourceFile, path.extname(sourceFile));
            /* rename file to .bin */
            const binFile = path.join(
                temporaryDirectory,
                `${fileNameNoExtension}.bin`
            );
            await storage().copy(sourceFile, binFile);
            guardFileExists(
                binFile,
                `Bin file missing, does not exist: ${binFile}`
            );
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
        private readonly overwrite: boolean
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
        /* Keep track of files that have already been extracted */
        const ignoreList: string[] = [];
        let extractionOccurred = true;

        while (extractionOccurred) {
            extractionOccurred = false;

            /* Try to extract each file */
            for (const filePath of currentFiles.filter(file => !ignoreList.includes(file))) {
                try {
                    const extension = fileExtension(filePath);
                    const extractOperation = EXTRACT_OPERATIONS.get(
                        extension.toLowerCase()
                    );

                    if (!extractOperation) {
                        continue;
                    }

                    log.info(
                        `Extracting file ${filePath} with operation ${extractOperation.name}`
                    );
                    const extractedFiles = await extractOperation(
                        filePath,
                        currentFiles
                    );
                    log.info(`Extracted files: ${extractedFiles}`);
                    /* Move extracted files back to current directory */
                    for (const extractedFile of extractedFiles) {
                        const newFilePath = path.join(
                            workingDirectory,
                            path.basename(extractedFile)
                        );
                        log.info(
                            `Moving extracted file ${extractedFile} to ${newFilePath}`
                        );
                        await this.storage.move(extractedFile, newFilePath);
                        currentFiles.push(newFilePath);
                    }
                    /* Make sure we don't try to extract the same file again */
                    ignoreList.push(filePath);

                    extractionOccurred = true;
                } catch (error) {
                    log.warn(
                        `Failed to extract file ${filePath}: ${JSON.stringify(
                            error
                        )}`
                    );
                    throw error;
                }
            }
        }

        const listings = await this.storage.list(workingDirectory);
        log.info(`Extracted files: ${listings.join(', ')}`);

        /* Re-grab all the files in the working directory */
        return listings;
    }

    async start(): Promise<string[]> {
        const outputFile = `${path.basename(this.sourceFiles[0] ?? '')}.chd`;
        const outputDirectory = path.dirname(this.sourceFiles[0] ?? '');
        const outputFilePath = path.join(outputDirectory, outputFile);
        if ((await storage().exists(outputFilePath)) && !this.overwrite) {
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

        const compressionCandidates = currentFiles.filter(
            file => ['gdi', 'cue'].includes(fileExtension(file).toLowerCase())
        );
        const binFiles = currentFiles.filter(
            file => fileExtension(file).toLowerCase() === 'bin'
        );

        /* If we don't have any cue files & we have exactly one bin file, create a cue file for it */
        if (compressionCandidates.length === 0 && binFiles.length === 1) {
            /* No .cue files found. See if we have any .bin files & create a cue file for them */
            const binFile = binFiles[0];
            guard(binFile !== undefined, `Bin file missing, does not exist: ${binFile}`);
            guardFileExists(binFile, `Bin file missing, does not exist: ${binFile}`);
            log.info(`No .cue files found. Creating from bin files ${binFile}`);
            const cueFileName = `${path.basename(binFile, path.extname(binFile))}.cue`;
            const cueFile = path.join(path.dirname(binFile), cueFileName);
            await cueSheet.createCueFile(binFile, cueFile);
            guardFileExists(
                cueFile,
                `CUE file missing, does not exist: ${cueFile}`
            );
            compressionCandidates.push(cueFile);
        }

        guard(
            compressionCandidates.length > 0,
            `No suitable files found for compression, ${compressionCandidates.join(', ')}, ${binFiles.join(', ')}`
        );

        const compressedOutputFiles = await Promise.all(
            compressionCandidates.map(async filePath => {
                const chdResult = await chd.create({
                    inputFilePath: filePath,
                });
                return chdResult;
            })
        );

        /* If we have compression results, return them */
        if (compressedOutputFiles.length > 0) {
            return compressedOutputFiles;
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
        private readonly removeSource: boolean
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
            log.info(`Processing files: ${files}`);
            const runner = this._createRunner(files, this.overwrite);
            if (runner instanceof Error) {
                log.error(
                    `Error creating runner for ${files}: ${runner.message}`
                );
                continue;
            }

            const sourceFileExtension = fileExtension(files[0] ?? '');
            const sourceFileNameNoExtension = path.basename(
                files[0] ?? '',
                `.${sourceFileExtension}`
            );
            const expectedOutputFileName = `${sourceFileNameNoExtension}.chd`;
            const expectedOutputFilePath = path.join(
                this.outputDir,
                expectedOutputFileName
            );

            if (
                (await storage().exists(expectedOutputFilePath)) &&
                !this.overwrite
            ) {
                log.info(
                    `Skipping ${files} - output file: ${expectedOutputFilePath} already exists in output directory`
                );
                continue;
            }

            const outputFilePaths = await runner.start();

            for (const [index, outputFilePath] of Object.entries(
                outputFilePaths.filter(filePath => filePath.endsWith('.chd'))
            )) {
                const outputFileExtension = fileExtension(outputFilePath);
                /* Attempt to rename the output file to the expected output file name
                       If there are multiple output files, append the index to the file name */
                let targetFileName = `${sourceFileNameNoExtension}.${outputFileExtension}`;
                if (outputFilePaths.length > 1) {
                    targetFileName = `${sourceFileNameNoExtension}.${index}.${outputFileExtension}`;
                }
                const targetPath = path.join(this.outputDir, targetFileName);
                const targetPathExists = await storage().exists(targetPath);

                if (targetPathExists && !this.overwrite) {
                    log.info(
                        `Skipping ${files} - output file ${targetPath} already exists in output directory`
                    );
                    continue;
                }

                await storage().move(outputFilePath, targetPath);
                outputFiles.push(targetPath);

                if (this.removeSource) {
                    await Promise.all(
                        files.map(file => storage().remove(file))
                    );
                    log.info(`Removed source files: ${files.join(', ')}`);
                }
            }
        }

        log.info(`Output files: ${outputFiles.join(', ')}`);
        return outputFiles;
    }
}
