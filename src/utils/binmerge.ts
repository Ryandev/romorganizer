/**
 * binmerge - TypeScript version (Simplified)
 * 
 * Takes a cue sheet with multiple binary track files and merges them together,
 * generating a corrected cue sheet in the process.
 * 
 * Copyright (C) 2024 Chris Putnam (original Python version)
 * TypeScript adaptation for project
 */

import { log } from './logger';
import { guard } from './guard';
import cueSheet from './cueSheet';

export interface TrackIndex {
  id: number;
  stamp: string;
  file_offset: number;
}

export interface Track {
  num: number;
  indexes: TrackIndex[];
  track_type: string;
  sectors?: number;
  file_offset?: number;
}

export interface BinFile {
  filename: string;
  tracks: Track[];
  size: number;
}



/**
 * Convert sectors to CUE timestamp format (MM:SS:FF)
 */
export function sectorsToCueStamp(sectors: number): string {
  // 75 sectors per second
  const minutes = Math.floor(sectors / 4500);
  const fields = sectors % 4500;
  const seconds = Math.floor(fields / 75);
  const finalFields = sectors % 75;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${finalFields.toString().padStart(2, '0')}`;
}

/**
 * Convert CUE timestamp format (MM:SS:FF) to sectors
 */
export function cueStampToSectors(stamp: string): number {
  // 75 sectors per second
  const match = stamp.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  if (!match) {
    throw new Error(`Invalid timestamp format: ${stamp}`);
  }
  const minutesString = match[1];
  const secondsString = match[2];
  const fieldsString = match[3];
  guard(minutesString !== undefined, `Invalid timestamp format: ${stamp}`);
  guard(secondsString !== undefined, `Invalid timestamp format: ${stamp}`);
  guard(fieldsString !== undefined, `Invalid timestamp format: ${stamp}`);

  const minutes = Number.parseInt(minutesString, 10);
  const seconds = Number.parseInt(secondsString, 10);
  const fields = Number.parseInt(fieldsString, 10);

  return fields + (seconds * 75) + (minutes * 60 * 75);
}

/**
 * Determine blocksize based on track type
 */
export function determineBlocksize(trackType: string): number {
  if (['AUDIO', 'MODE1/2352', 'MODE2/2352', 'CDI/2352'].includes(trackType)) {
    return 2352;
  } else if (trackType === 'CDG') {
    return 2448;
  } else if (trackType === 'MODE1/2048') {
    return 2048;
  } else if (['MODE2/2336', 'CDI/2336'].includes(trackType)) {
    return 2336;
  }
  return 2352; // default
}

/**
 * Parse CUE file content (string) and return structured data
 */
export function parseCueContent(cueContent: string, basePath: string = '', globalBlocksize: number = 2352): BinFile[] {
  const files: BinFile[] = [];
  let thisTrack: Track | undefined = undefined;
  let thisFile: BinFile | undefined = undefined;
  const binFilesMissing = false;

  const lines = cueContent.split('\n');

  for (const line of lines) {
    // Match FILE line
    const fileMatch = line.match(/FILE "?(.*?)"? BINARY/);
    if (fileMatch && fileMatch[1]) {
      const thisPath = basePath ? `${basePath}/${fileMatch[1]}` : fileMatch[1];
      thisFile = {
        filename: thisPath,
        tracks: [],
        size: 0 // Will be set by caller if needed
      };
      files.push(thisFile);
      continue;
    }

    // Match TRACK line
    const trackMatch = line.match(/TRACK (\d+) ([^\s]*)/);
    if (trackMatch && trackMatch[1] && trackMatch[2] && thisFile) {
      const trackNum = Number.parseInt(trackMatch[1], 10);
      const trackType = trackMatch[2];
      thisTrack = {
        num: trackNum,
        indexes: [],
        track_type: trackType
      };
      thisFile.tracks.push(thisTrack);

      // Set global blocksize if not already set
      if (globalBlocksize === 2352) { // Only update if using default
        const newBlocksize = determineBlocksize(trackType);
        if (newBlocksize !== 2352) {
          globalBlocksize = newBlocksize;
          log.info(`[DEBUG]\tLocked blocksize to ${globalBlocksize}`);
        }
      }
      continue;
    }

    // Match INDEX line
    const indexMatch = line.match(/INDEX (\d+) (\d+:\d+:\d+)/);
    if (indexMatch && indexMatch[1] && indexMatch[2] && thisTrack) {
      const indexId = Number.parseInt(indexMatch[1], 10);
      const stamp = indexMatch[2];
      const fileOffset = cueStampToSectors(stamp);
      thisTrack.indexes.push({
        id: indexId,
        stamp,
        file_offset: fileOffset
      });
      continue;
    }
  }

  if (binFilesMissing) {
    throw new Error('One or more bin files were missing on disk');
  }

  if (files.length === 0) {
    throw new Error('Unable to parse any bin files in the cueSheet. Is it empty?');
  }

  // If only 1 file, assume splitting, calc sectors of each
  if (files.length === 1 && files[0]) {
    const nextItemOffset = Math.floor(files[0].size / globalBlocksize);
    for (let i = files[0].tracks.length - 1; i >= 0; i--) {
      const t = files[0].tracks[i];
      if (t && t.indexes.length > 0 && t.indexes[0]) {
        t.sectors = nextItemOffset - t.indexes[0].file_offset;
        const nextOffset = t.indexes[0].file_offset;
        if (i > 0) {
          const prevTrack = files[0].tracks[i - 1];
          if (prevTrack && prevTrack.indexes.length > 0 && prevTrack.indexes[0]) {
            prevTrack.sectors = nextOffset - prevTrack.indexes[0].file_offset;
          }
        }
      }
    }
  }

  return files;
}

/**
 * Main merge operation (parse and generate merged cueSheet)
 */
export function merge(cueContent: string, basename: string, basePath: string = '', globalBlocksize: number = 2352): { cueContent: string; files: BinFile[] } {
  log.info('[INFO]\tParsing CUE content...');
  
  const files = parseCueContent(cueContent, basePath, globalBlocksize);
  const mergedCueContent = cueSheet.generateMergedCueSheet(basename, files, globalBlocksize);
  
  log.info(`[INFO]\tGenerated merged cueSheet for ${files.length} files`);

  return {
    cueContent: mergedCueContent,
    files,
  };
}

/**
 * Main split operation (parse and generate split cueSheet)
 */
export function split(cueContent: string, basename: string, basePath: string = '', globalBlocksize: number = 2352): { cueContent: string; file: BinFile } {
  log.info('[INFO]\tParsing CUE content...');
  
  const files = parseCueContent(cueContent, basePath, globalBlocksize);
  if (files.length !== 1 || !files[0]) {
    throw new Error('Split operation requires exactly one input file');
  }
  
  const splitCueContent = cueSheet.generateSplitCueSheet(basename, files[0]);
  
  log.info('[INFO]\tGenerated split cueSheet');
  return { cueContent: splitCueContent, file: files[0] };
}

// Export default functions for convenience
export default {
  sectorsToCueStamp,
  cueStampToSectors,
  determineBlocksize,
  parseCueContent,
  merge,
  split
}; 