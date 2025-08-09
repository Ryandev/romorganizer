/**
 * Cuesheet generation utilities
 *
 * Functions for generating merged and split cuesheets from parsed CUE data
 */

import type { BinFile } from './binmerge';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { guardFileExists } from './guard';
import { guard } from './guard';
import { parse } from 'ini';
import storage from './storage';

/**
 * Interface representing a track index in a CUE file
 */
export interface CueTrackIndex {
    id: number;
    timestamp: string /* MM:SS:FF format */;
    fileOffset?: number /* Optional sector offset */;
}

/**
 * Interface representing a track in a CUE file
 */
export interface CueTrack {
    number: number;
    type: string /* AUDIO, MODE1/2352, etc. */;
    indexes: CueTrackIndex[];
}

/**
 * Interface representing a file reference in a CUE file
 */
export interface CueFile {
    filename: string;
    type: string /* Usually "BINARY" */;
    tracks: CueTrack[];
}

/**
 * Interface representing the complete structure of a CUE file
 */
export interface CueSheet {
    files: CueFile[];
    /* Optional metadata that might be present in some CUE files */
    metadata?: {
        title?: string;
        performer?: string;
        songwriter?: string;
        catalog?: string;
        isrc?: string;
        comment?: string;
    };
}

/**
 * Interface for file processing results
 */
interface ProcessingResult {
    status: boolean;
    result: string[];
}

/**
 * Deserialize a CUE file string into a structured CueSheet object
 * @param cueContent - The CUE file content as a string
 * @returns CueSheet - The parsed CUE file structure
 */
function deserializeCueSheet(cueContent: string): CueSheet {
    const lines = cueContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    const cueSheet: CueSheet = { files: [] };
    let currentFile: CueFile | undefined;
    let currentTrack: CueTrack | undefined;

    for (const line of lines) {
        /* Parse FILE line */
        const fileMatch = line.match(/^FILE\s+"([^"]+)"\s+(\w+)$/i);
        if (fileMatch && fileMatch[1] && fileMatch[2]) {
            currentFile = {
                filename: fileMatch[1],
                type: fileMatch[2].toUpperCase(),
                tracks: [],
            };
            cueSheet.files.push(currentFile);
            currentTrack = undefined;
            continue;
        }

        /* Parse TRACK line */
        const trackMatch = line.match(/^TRACK\s+(\d+)\s+(\w+(?:\/\d+)?)$/i);
        if (trackMatch && trackMatch[1] && trackMatch[2] && currentFile) {
            currentTrack = {
                number: Number.parseInt(trackMatch[1], 10),
                type: trackMatch[2].toUpperCase(),
                indexes: [],
            };
            currentFile.tracks.push(currentTrack);
            continue;
        }

        /* Parse INDEX line */
        const indexMatch = line.match(
            /^INDEX\s+(\d+)\s+(\d{1,2}:\d{2}:\d{2})$/i
        );
        if (indexMatch && indexMatch[1] && indexMatch[2] && currentTrack) {
            const index: CueTrackIndex = {
                id: Number.parseInt(indexMatch[1], 10),
                timestamp: indexMatch[2],
            };
            currentTrack.indexes.push(index);
            continue;
        }

        /* Parse metadata lines (optional) */
        const titleMatch = line.match(/^TITLE\s+"([^"]+)"$/i);
        if (titleMatch) {
            if (!cueSheet.metadata) cueSheet.metadata = {};
            cueSheet.metadata.title = titleMatch[1];
            continue;
        }

        const performerMatch = line.match(/^PERFORMER\s+"([^"]+)"$/i);
        if (performerMatch) {
            if (!cueSheet.metadata) cueSheet.metadata = {};
            cueSheet.metadata.performer = performerMatch[1];
            continue;
        }

        const songwriterMatch = line.match(/^SONGWRITER\s+"([^"]+)"$/i);
        if (songwriterMatch) {
            if (!cueSheet.metadata) cueSheet.metadata = {};
            cueSheet.metadata.songwriter = songwriterMatch[1];
            continue;
        }

        const catalogMatch = line.match(/^CATALOG\s+(\w+)$/i);
        if (catalogMatch) {
            if (!cueSheet.metadata) cueSheet.metadata = {};
            cueSheet.metadata.catalog = catalogMatch[1];
            continue;
        }

        const isrcMatch = line.match(/^ISRC\s+(\w+)$/i);
        if (isrcMatch) {
            if (!cueSheet.metadata) cueSheet.metadata = {};
            cueSheet.metadata.isrc = isrcMatch[1];
            continue;
        }

        const commentMatch = line.match(/^REM\s+COMMENT\s+"([^"]+)"$/i);
        if (commentMatch) {
            if (!cueSheet.metadata) cueSheet.metadata = {};
            cueSheet.metadata.comment = commentMatch[1];
            continue;
        }
    }

    return cueSheet;
}

/**
 * Serialize a CueSheet object into a CUE file string
 * @param cueSheet - The CUE file structure to serialize
 * @returns string - The CUE file content as a string
 */
function serializeCueSheet(cueSheet: CueSheet): string {
    let output = '';

    /* Write metadata if present */
    if (cueSheet.metadata) {
        if (cueSheet.metadata.title) {
            output += `TITLE "${cueSheet.metadata.title}"\n`;
        }
        if (cueSheet.metadata.performer) {
            output += `PERFORMER "${cueSheet.metadata.performer}"\n`;
        }
        if (cueSheet.metadata.songwriter) {
            output += `SONGWRITER "${cueSheet.metadata.songwriter}"\n`;
        }
        if (cueSheet.metadata.catalog) {
            output += `CATALOG ${cueSheet.metadata.catalog}\n`;
        }
        if (cueSheet.metadata.isrc) {
            output += `ISRC ${cueSheet.metadata.isrc}\n`;
        }
        if (cueSheet.metadata.comment) {
            output += `REM COMMENT "${cueSheet.metadata.comment}"\n`;
        }
        if (output.length > 0) {
            output += '\n'; /* Add blank line after metadata */
        }
    }

    /* Write files and tracks */
    for (const file of cueSheet.files) {
        output += `FILE "${file.filename}" ${file.type}\n`;

        for (const track of file.tracks) {
            output += `  TRACK ${track.number.toString().padStart(2, '0')} ${track.type}\n`;

            for (const index of track.indexes) {
                output += `    INDEX ${index.id.toString().padStart(2, '0')} ${index.timestamp}\n`;
            }
        }
    }

    return output;
}

/**
 * Convert sectors to CUE timestamp format (MM:SS:FF)
 */
function sectorsToCueStamp(sectors: number): string {
    /* 75 sectors per second */
    const minutes = Math.floor(sectors / 4500);
    const fields = sectors % 4500;
    const seconds = Math.floor(fields / 75);
    const finalFields = sectors % 75;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${finalFields.toString().padStart(2, '0')}`;
}

/**
 * Generate track filename based on redump naming convention
 */
function trackFilename(
    prefix: string,
    trackNum: number,
    trackCount: number
): string {
    /* Redump naming convention: */
    /* If there is exactly one track: "" (nothing) */
    /* If there are less than 10 tracks: "Track 1", "Track 2", etc. */
    /* If there are more than 10 tracks: "Track 01", "Track 02", etc. */
    if (trackCount === 1) {
        return `${prefix}.bin`;
    }
    if (trackCount > 9) {
        return `${prefix} (Track ${trackNum.toString().padStart(2, '0')}).bin`;
    }
    return `${prefix} (Track ${trackNum}).bin`;
}

/**
 * Generate a 'merged' cueSheet (one bin file with tracks indexed within)
 */
function generateMergedCueSheet(
    basename: string,
    files: BinFile[],
    globalBlocksize: number = 2352
): string {
    let cueSheet = `FILE "${basename}.bin" BINARY\n`;
    let sectorPosition = 0;

    for (const f of files) {
        for (const t of f.tracks) {
            cueSheet += `  TRACK ${t.num.toString().padStart(2, '0')} ${t.track_type}\n`;
            for (const i of t.indexes) {
                cueSheet += `    INDEX ${i.id.toString().padStart(2, '0')} ${sectorsToCueStamp(sectorPosition + i.file_offset)}\n`;
            }
        }
        sectorPosition += Math.floor(f.size / globalBlocksize);
    }

    return cueSheet;
}

/**
 * Generate a 'split' cueSheet (one bin file for every track)
 */
function generateSplitCueSheet(basename: string, mergedFile: BinFile): string {
    let cueSheet = '';

    for (const track of mergedFile.tracks) {
        const trackFn = trackFilename(
            basename,
            track.num,
            mergedFile.tracks.length
        );
        cueSheet += `FILE "${trackFn}" BINARY\n`;
        cueSheet += `  TRACK ${track.num.toString().padStart(2, '0')} ${track.track_type}\n`;
        for (const i of track.indexes) {
            const sectorPos =
                i.file_offset - (track.indexes[0]?.file_offset || 0);
            cueSheet += `    INDEX ${i.id.toString().padStart(2, '0')} ${sectorsToCueStamp(sectorPos)}\n`;
        }
    }

    return cueSheet;
}

/**
 * Create a simple CUE file for a single BIN file
 * @param binFilePath - Path to the BIN file
 * @param cueFilePath - Path where the CUE file should be created
 * @returns Promise<void> - Resolves when CUE file is created successfully
 */
async function createCueFile(
    binFilePath: string,
    cueFilePath?: string
): Promise<void> {
    /* Check if BIN file exists */
    guardFileExists(binFilePath, `Bin file does not exist: ${binFilePath}`);
    guard(
        binFilePath.toLowerCase().endsWith('.bin'),
        `Bin file must end with .bin: ${binFilePath}`
    );

    /* Get the BIN file name (without path) */
    const binFileName = path.basename(binFilePath);

    if (!cueFilePath) {
        const binFileNameWithoutExtension = path.basename(binFileName, '.bin');
        cueFilePath = `${binFileNameWithoutExtension}.cue`;
    }

    /* Create the CUE content */
    const cueContent = `FILE "${binFileName}" BINARY
  TRACK 01 MODE2/2352
    INDEX 01 00:00:00`;

    /* Write the CUE file */
    await writeFile(cueFilePath, cueContent, 'utf8');
}

/**
 * Convert a CCD file to a CUE file
 * @param filePath - Path to the CCD file
 * @returns Promise<string> - The generated CUE content
 */
async function parseFromCCDFile(filePath: string): Promise<string> {
    /* Verify extension is .ccd */
    guard(
        filePath.toLowerCase().endsWith('.ccd'),
        `File must have .ccd extension: ${filePath}`
    );
    guardFileExists(filePath, `CCD file does not exist: ${filePath}`);

    /* Read and parse the CCD file content */
    const storageInstance = await storage();
    const ccdContentBytes = await storageInstance.read(filePath);
    const ccdContent = new TextDecoder().decode(ccdContentBytes);
    const sections = parse(ccdContent) as Record<
        string,
        Record<string, string>
    >;

    /* Find the image file */
    const dir = filePath.slice(0, filePath.lastIndexOf('/') + 1);
    const baseName = path.basename(filePath, '.ccd');
    const imageExtensions = ['.img', '.bin', '.iso'];
    let imageFile = '';

    for (const ext of imageExtensions) {
        const testPath = dir + baseName + ext;
        try {
            await guardFileExists(testPath, '');
            imageFile = baseName + ext;
            break;
        } catch {
            /* Continue to next extension */
        }
    }

    if (!imageFile) {
        throw new Error(`No image file found for CCD: ${filePath}`);
    }

    /* Generate CUE content */
    let cueContent = `FILE "${imageFile}" BINARY\n`;
    let trackCounter = 0;
    let begin = false;

    /* Process each Entry section */
    for (const [sectionName, sectionData] of Object.entries(sections)) {
        if (!sectionName.startsWith('Entry')) {
            continue;
        }

        const control = sectionData['Control'] || '0x00';
        const session = Number.parseInt(sectionData['Session'] || '1', 10);
        const pmin = Number.parseInt(sectionData['PMin'] || '0', 10);
        const psec = Number.parseInt(sectionData['PSec'] || '0', 10);
        const pframe = Number.parseInt(sectionData['PFrame'] || '0', 10);
        const plba = Number.parseInt(sectionData['PLBA'] || '0', 10);

        /* Check if this is the beginning track */
        if (plba === 0) {
            begin = true;
        }

        if (begin) {
            trackCounter++;

            /* Adjust timing as per the Python script logic */
            let adjustedMin = pmin;
            let adjustedSec = psec;
            const adjustedFrame = pframe;

            if (adjustedSec === 0) {
                if (adjustedMin >= 1) {
                    adjustedMin -= 1;
                    adjustedSec = 60;
                } else {
                    adjustedMin = 0;
                    adjustedSec = 0;
                }
            }
            adjustedSec -= 2;

            /* Determine track type based on control value */
            const trackType = control === '0x04' ? 'MODE1/2352' : 'AUDIO';

            cueContent += `  TRACK ${trackCounter.toString().padStart(2, '0')} ${trackType}\n`;
            cueContent += `    INDEX ${session.toString().padStart(2, '0')} ${adjustedMin.toString().padStart(2, '0')}:${adjustedSec.toString().padStart(2, '0')}:${adjustedFrame.toString().padStart(2, '0')}\n`;
        }
    }

    return cueContent;
}

/**
 * Process CCD files in a directory and convert them to CUE files
 * Priority: High (1) - CCD files should be processed early
 */
async function processCCDFiles(
    sourceDirectory: string
): Promise<ProcessingResult> {
    const storageInstance = await storage();
    const files = await storageInstance.list(sourceDirectory);
    const ccdFiles = files.filter(file => file.endsWith('.ccd'));

    if (ccdFiles.length === 0) {
        return { status: false, result: [] };
    }

    const generatedFiles: string[] = [];

    for (const ccdFile of ccdFiles) {
        try {
            const ccdPath = ccdFile; /* ccdFile is already the full path */
            const cueContent = await parseFromCCDFile(ccdPath);

            /* Generate CUE file in the same directory */
            const baseName = path.basename(ccdFile, '.ccd');
            const cueFilePath = path.join(sourceDirectory, `${baseName}.cue`);

            await storageInstance.write(
                cueFilePath,
                new TextEncoder().encode(cueContent)
            );
            generatedFiles.push(cueFilePath);
        } catch (error) {
            /* Log error but continue processing other files */
            console.warn(`Failed to process CCD file ${ccdFile}:`, error);
        }
    }

    return {
        status: generatedFiles.length > 0,
        result: generatedFiles,
    };
}

/**
 * Process BIN files in a directory and create basic CUE files
 * Priority: Medium (2) - BIN files should be processed after CCD files
 */
async function processBINFiles(
    sourceDirectory: string
): Promise<ProcessingResult> {
    const storageInstance = await storage();
    const files = await storageInstance.list(sourceDirectory);
    const binFiles = files.filter(file => file.endsWith('.bin'));

    if (binFiles.length === 0) {
        return { status: false, result: [] };
    }

    const generatedFiles: string[] = [];

    for (const binFile of binFiles) {
        try {
            const binPath = binFile; /* binFile is already the full path */
            const baseName = path.basename(binFile, '.bin');
            const cueFilePath = path.join(sourceDirectory, `${baseName}.cue`);

            /* Check if CUE file already exists */
            const cueExists = await storageInstance.exists(cueFilePath);
            if (cueExists) {
                continue; /* Skip if CUE already exists */
            }

            await createCueFile(binPath, cueFilePath);
            generatedFiles.push(cueFilePath);
        } catch (error) {
            /* Log error but continue processing other files */
            console.warn(`Failed to process BIN file ${binFile}:`, error);
        }
    }

    return {
        status: generatedFiles.length > 0,
        result: generatedFiles,
    };
}

/**
 * Array of file processing functions ordered by priority
 * Higher priority (lower number) functions are called first
 */
const fileProcessors = [
    { priority: 1, name: 'CCD to CUE', processor: processCCDFiles },
    { priority: 2, name: 'BIN to CUE', processor: processBINFiles },
];

/**
 * Process all files in a directory using the ordered processor array
 * @param sourceDirectory - Directory to scan and process
 * @returns Promise<ProcessingResult> - Overall processing status and results
 */
async function processDirectory(
    sourceDirectory: string
): Promise<ProcessingResult> {
    const storageInstance = await storage();

    /* Verify directory exists */
    const dirExists = await storageInstance.exists(sourceDirectory);
    if (!dirExists) {
        throw new Error(`Directory does not exist: ${sourceDirectory}`);
    }

    const allResults: string[] = [];
    let anyProcessed = false;

    /* Process files in priority order */
    for (const { processor, name } of fileProcessors) {
        try {
            const result = await processor(sourceDirectory);
            if (result.status) {
                anyProcessed = true;
                allResults.push(...result.result);
                console.log(
                    `${name} processor generated ${result.result.length} files`
                );
            }
        } catch (error) {
            console.warn(`${name} processor failed:`, error);
        }
    }

    return {
        status: anyProcessed,
        result: allResults,
    };
}

/**
 * Parse a CUE file and return its content as a string
 * @param filePath - Path to the CUE file
 * @returns Promise<string> - The CUE file content
 */
async function parseFromCueFile(filePath: string): Promise<string> {
    /* Verify extension is .cue */
    guard(
        filePath.toLowerCase().endsWith('.cue'),
        `File must have .cue extension: ${filePath}`
    );
    guardFileExists(filePath, `CUE file does not exist: ${filePath}`);

    /* Read the CUE file content */
    const storageInstance = await storage();
    const cueContentBytes = await storageInstance.read(filePath);
    const cueContent = new TextDecoder().decode(cueContentBytes);

    return cueContent;
}

export default {
    generateMergedCueSheet,
    generateSplitCueSheet,
    createCueFile,
    parseFromCCDFile,
    parseFromCueFile,
    deserializeCueSheet,
    serializeCueSheet,
    processDirectory,
    fileProcessors,
};
