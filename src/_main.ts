#!/usr/bin/env node

import { basename, join } from 'path';
import { $ } from 'zx';
import { log } from './utils/logger.js';
import { createArchive } from './archive/index.js';
import { loadArguments } from './cli.js';
import cueSheet from './utils/cuesheet.js';
import chd from './utils/chd.js';
import { guardDirectoryExists, guardFileExists } from './guard.js';
import storage from './utils/storage.js';

// Global temporary files array for archive operations
globalThis.temporaryFiles = [];

async function cleanup(): Promise<void> {
    const storageInstance = await storage();

    for (const file of globalThis.temporaryFiles) {
        try {
            await storageInstance.remove(file);
        } catch {
            // Ignore errors during cleanup
        }
    }
    globalThis.temporaryFiles.length = 0;
}

function abort(message: string): never {
    log.error(message);
    cleanup();
    process.exit(1);
}

async function checkEnvironment(): Promise<void> {
    const commands = [
        { name: '7z', installCmd: 'sudo apt install p7zip-full p7zip-rar' },
        { name: 'chdman', installCmd: 'sudo apt-get install -y mame-tools' },
        { name: 'unrar', installCmd: 'sudo apt install unrar' },
        { name: 'unzip', installCmd: 'sudo apt install unzip' },
        {
            name: 'unecm',
            installCmd: 'see project: https://github.com/kidoz/ecm',
        },
    ];

    for (const cmd of commands) {
        try {
            await $`command -v ${cmd.name}`;
        } catch {
            abort(`${cmd.name} is not installed, ${cmd.installCmd}`);
        }
    }
}

async function run(
    searchExtension: string,
    searchPath: string,
    outputPath: string
): Promise<void> {
    const storageInstance = await storage();

    if (!searchExtension) {
        log.info('searchExtension is not set');
        return;
    }

    guardDirectoryExists(
        searchPath,
        `searchPath is not a directory: ${searchPath}`
    );

    await storageInstance.createDirectory(outputPath);

    const allFiles = await storageInstance.list(searchPath, {
        recursive: true,
    });
    const matchingFiles = await Promise.all(
        allFiles.map(async (file: string) => ({
            file,
            isMatch:
                file.endsWith(`.${searchExtension}`) &&
                (await storageInstance.isFile(file)),
        }))
    );
    const filteredFiles = matchingFiles
        .filter((item: { file: string; isMatch: boolean }) => item.isMatch)
        .map((item: { file: string; isMatch: boolean }) => item.file);

    if (filteredFiles.length > 0) {
        for (const file of filteredFiles) {
            guardFileExists(file, `File does not exist: ${file}`);

            const chdFileName = basename(file, `.${searchExtension}`);
            const chdFile = join(outputPath, `${chdFileName}.chd`);

            try {
                guardFileExists(chdFile);
                log.info(
                    `Chd file already exists: ${chdFile}, skipping ${file}`
                );
                continue;
            } catch {
                // File doesn't exist, continue with processing
            }

            const temporaryPath =
                await storageInstance.createTemporaryDirectory();
            globalThis.temporaryFiles.push(temporaryPath);

            // Extract the containing zip/rar/7z file to the temporary directory
            const archive = createArchive(file);
            const extractedPath = await archive.extract();

            // Extract all ecm files in the temporary directory
            const allExtractedFiles = await storageInstance.list(
                extractedPath,
                {
                    recursive: true,
                }
            );
            const ecmFilesWithChecks = await Promise.all(
                allExtractedFiles.map(async (file: string) => ({
                    file,
                    isMatch:
                        file.endsWith('.ecm') &&
                        (await storageInstance.isFile(file)),
                }))
            );
            const ecmFiles = ecmFilesWithChecks
                .filter(
                    (item: { file: string; isMatch: boolean }) => item.isMatch
                )
                .map((item: { file: string; isMatch: boolean }) => item.file);

            for (const ecmFile of ecmFiles) {
                log.info(`Extracting ${ecmFile} to ${extractedPath}`);
                const ecmArchive = createArchive(ecmFile);
                await ecmArchive.extract();
                await storageInstance.remove(ecmFile);
            }

            // Move .img files to .iso
            const allFilesAfterEcm = await storageInstance.list(extractedPath, {
                recursive: true,
            });
            const imgFilesWithChecks = await Promise.all(
                allFilesAfterEcm.map(async (file: string) => ({
                    file,
                    isMatch:
                        file.endsWith('.img') &&
                        (await storageInstance.isFile(file)),
                }))
            );
            const imgFiles = imgFilesWithChecks
                .filter(
                    (item: { file: string; isMatch: boolean }) => item.isMatch
                )
                .map((item: { file: string; isMatch: boolean }) => item.file);

            for (const imgFile of imgFiles) {
                log.info('Move files .img to .iso');
                const imgFileName = basename(imgFile, '.img');
                const isoFile = join(extractedPath, `${imgFileName}.iso`);
                const cueFile = join(extractedPath, `${imgFileName}.cue`);

                await storageInstance.copy(imgFile, isoFile);
                await storageInstance.remove(imgFile);

                // Update the cue file to use the new iso file name
                const cueExists = await storageInstance.exists(cueFile);
                if (cueExists) {
                    const cueContent = await storageInstance.read(cueFile);
                    const cueText = new TextDecoder().decode(cueContent);
                    const updatedCueText = cueText.replaceAll('.img', '.iso');
                    const updatedCueBuffer = new TextEncoder().encode(
                        updatedCueText
                    );
                    await storageInstance.write(cueFile, updatedCueBuffer);
                }
            }

            // Find the cue file in the temporary directory
            const allFilesAfterImg = await storageInstance.list(extractedPath, {
                recursive: true,
            });
            const cueFilesWithChecks = await Promise.all(
                allFilesAfterImg.map(async (file: string) => ({
                    file,
                    isMatch:
                        file.endsWith('.cue') &&
                        (await storageInstance.isFile(file)),
                }))
            );
            let cueFile = cueFilesWithChecks.find(
                (item: { file: string; isMatch: boolean }) => item.isMatch
            )?.file;

            // If no cue file is found, create one for bin/iso files
            if (!cueFile) {
                const binFilesWithChecks = await Promise.all(
                    allFilesAfterImg.map(async (file: string) => ({
                        file,
                        isMatch:
                            file.endsWith('.bin') &&
                            (await storageInstance.isFile(file)) &&
                            !basename(file).includes('Track'),
                    }))
                );
                const binFiles = binFilesWithChecks
                    .filter(
                        (item: { file: string; isMatch: boolean }) =>
                            item.isMatch
                    )
                    .map(
                        (item: { file: string; isMatch: boolean }) => item.file
                    );

                for (const binFile of binFiles) {
                    const cueFileName = basename(binFile, '.bin');
                    try {
                        await cueSheet.createCueFile(
                            binFile,
                            join(extractedPath, `${cueFileName}.cue`)
                        );
                    } catch (error) {
                        abort(
                            `Failed to create cue file for ${binFile}: ${error}`
                        );
                    }
                }

                const isoFilesWithChecks = await Promise.all(
                    allFilesAfterImg.map(async (file: string) => ({
                        file,
                        isMatch:
                            file.endsWith('.iso') &&
                            (await storageInstance.isFile(file)) &&
                            !basename(file).includes('Track'),
                    }))
                );
                const isoFiles = isoFilesWithChecks
                    .filter(
                        (item: { file: string; isMatch: boolean }) =>
                            item.isMatch
                    )
                    .map(
                        (item: { file: string; isMatch: boolean }) => item.file
                    );

                for (const isoFile of isoFiles) {
                    const cueFileName = basename(isoFile, '.iso');
                    try {
                        await cueSheet.createCueFile(
                            isoFile,
                            join(extractedPath, `${cueFileName}.cue`)
                        );
                    } catch (error) {
                        abort(
                            `Failed to create cue file for ${isoFile}: ${error}`
                        );
                    }
                }

                const allFilesAfterCue = await storageInstance.list(
                    extractedPath,
                    {
                        recursive: true,
                    }
                );
                const cueFilesAfterCreation = await Promise.all(
                    allFilesAfterCue.map(async (file: string) => ({
                        file,
                        isMatch:
                            file.endsWith('.cue') &&
                            (await storageInstance.isFile(file)),
                    }))
                );
                cueFile = cueFilesAfterCreation.find(
                    (item: { file: string; isMatch: boolean }) => item.isMatch
                )?.file;
            }

            if (!cueFile) {
                abort(
                    `No cue file found in ${extractedPath}, skipping ${file}`
                );
            }

            const lsOutput = await $`ls -la "${extractedPath}"`;
            console.log(lsOutput.stdout);
            log.info('--------------------------------');

            // Create the chd file
            log.info(`Creating ${chdFile} from ${cueFile}`);
            try {
                await chd.create({ cueFilePath: cueFile });
                log.info(`Created chd file: ${chdFile}`);
            } catch (error) {
                abort(`Failed to create CHD file ${chdFile}: ${error}`);
            }

            await cleanup();
        }
        log.info(
            `Conversion completed for ${searchExtension} files in ${searchPath}`
        );
    } else {
        log.warn(`No ${searchExtension} files found in ${searchPath}`);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, cleaning up...');
    cleanup();
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, cleaning up...');
    cleanup();
    process.exit(1);
});

// Main execution
try {
    await checkEnvironment();

    const args = process.argv.slice(2);
    const launchParameters = loadArguments(args);

    log.banner('Converting zip files');
    await run('zip', launchParameters.SOURCE_DIR, launchParameters.OUTPUT_DIR);

    log.banner('Converting 7z files');
    await run('7z', launchParameters.SOURCE_DIR, launchParameters.OUTPUT_DIR);

    log.banner('Converting rar files');
    await run('rar', launchParameters.SOURCE_DIR, launchParameters.OUTPUT_DIR);

    log.banner('Conversion completed');
    process.exit(0);
} catch (error) {
    if (error instanceof Error) {
        abort(error.message);
    } else {
        abort(`Unexpected error: ${error}`);
    }
}
