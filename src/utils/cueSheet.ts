/**
 * Cuesheet generation utilities
 * 
 * Functions for generating merged and split cuesheets from parsed CUE data
 */

import type { BinFile } from './binmerge';
import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { guardFileExists } from './guard';
import { guard } from './guard';

/**
 * Convert sectors to CUE timestamp format (MM:SS:FF)
 */
function sectorsToCueStamp(sectors: number): string {
  // 75 sectors per second
  const minutes = Math.floor(sectors / 4500);
  const fields = sectors % 4500;
  const seconds = Math.floor(fields / 75);
  const finalFields = sectors % 75;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${finalFields.toString().padStart(2, '0')}`;
}

/**
 * Generate track filename based on redump naming convention
 */
function trackFilename(prefix: string, trackNum: number, trackCount: number): string {
  // Redump naming convention:
  // If there is exactly one track: "" (nothing)
  // If there are less than 10 tracks: "Track 1", "Track 2", etc.
  // If there are more than 10 tracks: "Track 01", "Track 02", etc.
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
function generateMergedCueSheet(basename: string, files: BinFile[], globalBlocksize: number = 2352): string {
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
    const trackFn = trackFilename(basename, track.num, mergedFile.tracks.length);
    cueSheet += `FILE "${trackFn}" BINARY\n`;
    cueSheet += `  TRACK ${track.num.toString().padStart(2, '0')} ${track.track_type}\n`;
    for (const i of track.indexes) {
      const sectorPos = i.file_offset - (track.indexes[0]?.file_offset || 0);
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
async function createCueFile(binFilePath: string, cueFilePath?: string): Promise<void> {
  // Check if BIN file exists
  guardFileExists(binFilePath, `Bin file does not exist: ${binFilePath}`);
  guard(binFilePath.endsWith('.bin'), `Bin file must end with .bin: ${binFilePath}`);

  // Get the BIN file name (without path)
  const binFileName = basename(binFilePath);

  if (!cueFilePath) {
    const binFileNameWithoutExtension = basename(binFileName, '.bin');
    cueFilePath = `${binFileNameWithoutExtension}.cue`;
  }

  // Create the CUE content
  const cueContent = `FILE "${binFileName}" BINARY
  TRACK 01 MODE2/2352
    INDEX 01 00:00:00`;

  // Write the CUE file
  await writeFile(cueFilePath, cueContent, 'utf8');
}

export default {
    generateMergedCueSheet,
    generateSplitCueSheet,
    createCueFile,
}
