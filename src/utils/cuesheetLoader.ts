import { log } from './logger';
import storage from './storage';
import { createArchive } from '../archive';
import path from 'node:path';

export class CuesheetLoaderException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CuesheetLoaderException';
    }
}

export interface CuesheetInfo {
    name: string;
    content: string;
    path: string;
}

export interface CuesheetEntry {
    name: string;
    path: string;
    load: () => Promise<CuesheetInfo>;
}

/**
 * Loads cuesheets from a zip file containing master copies of .cue files
 * Returns an array of cuesheet entries with lazy loading promises
 * @param zipPath Path to the zip file containing cuesheets
 * @returns Promise<CuesheetEntry[]> Array of cuesheet entries with lazy loading
 */
export async function loadCuesheetsFromZip(
    zipPath: string
): Promise<CuesheetEntry[]> {
    log.info(`Loading cuesheets from zip file: ${zipPath}`);

    /* Verify the zip file exists */
    if (!(await storage().exists(zipPath))) {
        throw new CuesheetLoaderException(
            `Cuesheets zip file does not exist: ${zipPath}`
        );
    }

    /* Create a temporary directory for extraction */
    const tempDir = await storage().createTemporaryDirectory();

    try {
        /* Extract the zip file */
        const zipArchive = createArchive(zipPath);
        const extractedDir = await zipArchive.extract();

        /* Find all .cue files in the extracted directory */
        const allFiles = await storage().list(extractedDir, {
            recursive: true,
        });
        const cueFiles = allFiles.filter(
            file => path.extname(file).toLowerCase() === '.cue'
        );

        if (cueFiles.length === 0) {
            throw new CuesheetLoaderException(
                `No .cue files found in zip: ${zipPath}`
            );
        }

        log.info(`Found ${cueFiles.length} cuesheet files in zip`);

        /* Create cuesheet entries with lazy loading promises */
        const cuesheetEntries: CuesheetEntry[] = [];

        for (const cueFile of cueFiles) {
            const cueName = path.basename(cueFile, '.cue');

            const entry: CuesheetEntry = {
                name: cueName,
                path: cueFile,
                load: async (): Promise<CuesheetInfo> => {
                    try {
                        const content = await storage().read(cueFile);
                        const decoder = new TextDecoder();
                        const cueContent = decoder.decode(content);

                        log.info(`Lazy loaded cuesheet: ${cueName}`);

                        return {
                            name: cueName,
                            content: cueContent,
                            path: cueFile,
                        };
                    } catch (error) {
                        throw new CuesheetLoaderException(
                            `Failed to load cuesheet ${cueFile}: ${error instanceof Error ? error.message : String(error)}`
                        );
                    }
                },
            };

            cuesheetEntries.push(entry);
        }

        log.info(
            `Successfully created ${cuesheetEntries.length} cuesheet entries with lazy loading`
        );

        return cuesheetEntries;
    } catch (error) {
        /* Clean up the temporary directory */
        try {
            await storage().remove(tempDir);
        } catch (cleanupError) {
            log.warn(
                `Failed to clean up temporary directory ${tempDir}: ${cleanupError}`
            );
        }

        if (error instanceof CuesheetLoaderException) {
            throw error;
        }

        throw new CuesheetLoaderException(
            `Failed to load cuesheets from zip ${zipPath}: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Finds a specific cuesheet entry by name from the cuesheet entries
 * @param cuesheetEntries Array of cuesheet entries
 * @param gameName Name of the game to find cuesheet for
 * @returns CuesheetEntry | undefined The matching cuesheet entry or undefined if not found
 */
export function findCuesheetEntryForGame(
    cuesheetEntries: CuesheetEntry[],
    gameName: string
): CuesheetEntry | undefined {
    /* Try exact match first */
    const exactMatch = cuesheetEntries.find(entry => entry.name === gameName);
    if (exactMatch) {
        return exactMatch;
    }

    /* Try case-insensitive match */
    const caseInsensitiveMatch = cuesheetEntries.find(
        entry => entry.name.toLowerCase() === gameName.toLowerCase()
    );
    if (caseInsensitiveMatch) {
        return caseInsensitiveMatch;
    }

    /* Try partial match (in case of slight naming differences) */
    const partialMatch = cuesheetEntries.find(
        entry =>
            entry.name.toLowerCase().includes(gameName.toLowerCase()) ||
            gameName.toLowerCase().includes(entry.name.toLowerCase())
    );
    if (partialMatch) {
        log.info(
            `Found partial match for game "${gameName}": "${partialMatch.name}"`
        );
        return partialMatch;
    }

    return undefined;
}

/**
 * Finds and loads a specific cuesheet by name from the cuesheet entries
 * @param cuesheetEntries Array of cuesheet entries
 * @param gameName Name of the game to find cuesheet for
 * @returns Promise<CuesheetInfo | undefined> The loaded cuesheet or undefined if not found
 */
export async function findAndLoadCuesheetForGame(
    cuesheetEntries: CuesheetEntry[],
    gameName: string
): Promise<CuesheetInfo | undefined> {
    const entry = findCuesheetEntryForGame(cuesheetEntries, gameName);
    if (entry) {
        return await entry.load();
    }
    return undefined;
}

/**
 * Loads a .cue file directly from a filepath
 * @param cueFilePath Path to the .cue file
 * @returns Promise<CuesheetInfo> The loaded cuesheet information
 */
export async function loadCuesheetFromFile(
    cueFilePath: string
): Promise<CuesheetInfo> {
    log.info(`Loading cuesheet from file: ${cueFilePath}`);

    /* Verify the file exists */
    if (!(await storage().exists(cueFilePath))) {
        throw new CuesheetLoaderException(
            `Cuesheet file does not exist: ${cueFilePath}`
        );
    }

    /* Verify it's a .cue file */
    const fileExtension = path.extname(cueFilePath).toLowerCase();
    if (fileExtension !== '.cue') {
        throw new CuesheetLoaderException(
            `File is not a .cue file: ${cueFilePath}`
        );
    }

    try {
        const content = await storage().read(cueFilePath);
        const decoder = new TextDecoder();
        const cueContent = decoder.decode(content);

        const cueName = path.basename(cueFilePath, '.cue');

        log.info(`Successfully loaded cuesheet: ${cueName}`);

        return {
            name: cueName,
            content: cueContent,
            path: cueFilePath,
        };
    } catch (error) {
        throw new CuesheetLoaderException(
            `Failed to load cuesheet from file ${cueFilePath}: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Determines if a file path points to a zip file containing cuesheets
 * @param filePath Path to check
 * @returns Promise<boolean> True if it's a zip file that likely contains cuesheets
 */
export async function isZipWithCuesheets(filePath: string): Promise<boolean> {
    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension !== '.zip') {
        return false;
    }

    if (!(await storage().exists(filePath))) {
        return false;
    }

    try {
        /* Try to extract and check for .cue files */
        const zipArchive = createArchive(filePath);
        const extractedDir = await zipArchive.extract();

        const allFiles = await storage().list(extractedDir, {
            recursive: true,
        });
        const hasCueFiles = allFiles.some(
            file => path.extname(file).toLowerCase() === '.cue'
        );

        /* Clean up */
        await storage().remove(extractedDir);

        return hasCueFiles;
    } catch (error) {
        log.warn(
            `Failed to check zip contents: ${error instanceof Error ? error.message : String(error)}`
        );
        return false;
    }
}
