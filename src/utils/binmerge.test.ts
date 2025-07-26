import {
  sectorsToCueStamp,
  cueStampToSectors,
  determineBlocksize,
  parseCueContent,
  merge,
  split,
  type BinFile
} from './binmerge';
import cuesheet from './cueSheet.js';
const { generateMergedCueSheet, generateSplitCueSheet } = cuesheet;

// Mock the logger
jest.mock('./logger.js', () => ({
  log: {
    banner: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import { log } from './logger.js';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Binmerge Functions', () => {
  describe('Timestamp Conversion', () => {
    it('should convert sectors to CUE timestamp correctly', () => {
      expect(sectorsToCueStamp(0)).toBe('00:00:00');
      expect(sectorsToCueStamp(75)).toBe('00:01:00');
      expect(sectorsToCueStamp(4500)).toBe('01:00:00');
      expect(sectorsToCueStamp(4575)).toBe('01:01:00');
    });

    it('should convert CUE timestamp to sectors correctly', () => {
      expect(cueStampToSectors('00:00:00')).toBe(0);
      expect(cueStampToSectors('00:01:00')).toBe(75);
      expect(cueStampToSectors('01:00:00')).toBe(4500);
      expect(cueStampToSectors('01:01:00')).toBe(4575);
    });

    it('should throw error for invalid timestamp format', () => {
      expect(() => cueStampToSectors('invalid')).toThrow('Invalid timestamp format: invalid');
      expect(() => cueStampToSectors('1:2:3:4')).toThrow('Invalid timestamp format: 1:2:3:4');
      expect(() => cueStampToSectors('01:02')).toThrow('Invalid timestamp format: 01:02');
      expect(() => cueStampToSectors('')).toThrow('Invalid timestamp format: ');
      expect(() => cueStampToSectors('abc:def:ghi')).toThrow('Invalid timestamp format: abc:def:ghi');
    });
  });

  describe('Blocksize Determination', () => {
    it('should determine correct blocksize for different track types', () => {
      expect(determineBlocksize('AUDIO')).toBe(2352);
      expect(determineBlocksize('MODE1/2352')).toBe(2352);
      expect(determineBlocksize('MODE2/2352')).toBe(2352);
      expect(determineBlocksize('CDI/2352')).toBe(2352);
      expect(determineBlocksize('CDG')).toBe(2448);
      expect(determineBlocksize('MODE1/2048')).toBe(2048);
      expect(determineBlocksize('MODE2/2336')).toBe(2336);
      expect(determineBlocksize('CDI/2336')).toBe(2336);
      expect(determineBlocksize('UNKNOWN')).toBe(2352); // default
    });
  });

  describe('CUE Content Parsing', () => {
    it('should parse simple single-track CUE content', () => {
      const cueContent = `FILE "game.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00`;

      const files = parseCueContent(cueContent);
      
      expect(files).toHaveLength(1);
      expect(files[0]?.filename).toBe('game.bin');
      expect(files[0]?.tracks).toHaveLength(1);
      expect(files[0]?.tracks[0]?.num).toBe(1);
      expect(files[0]?.tracks[0]?.track_type).toBe('AUDIO');
      expect(files[0]?.tracks[0]?.indexes).toHaveLength(1);
      expect(files[0]?.tracks[0]?.indexes[0]?.id).toBe(1);
      expect(files[0]?.tracks[0]?.indexes[0]?.stamp).toBe('00:00:00');
    });

    it('should parse multi-track CUE content', () => {
      const cueContent = `FILE "game.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00
  TRACK 02 AUDIO
    INDEX 01 00:01:20`;

      const files = parseCueContent(cueContent);
      
      expect(files).toHaveLength(1);
      expect(files[0]?.tracks).toHaveLength(2);
      expect(files[0]?.tracks[0]?.num).toBe(1);
      expect(files[0]?.tracks[1]?.num).toBe(2);
    });

    it('should parse multi-file CUE content', () => {
      const cueContent = `FILE "track1.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00
FILE "track2.bin" BINARY
  TRACK 02 AUDIO
    INDEX 01 00:00:00`;

      const files = parseCueContent(cueContent);
      
      expect(files).toHaveLength(2);
      expect(files[0]?.filename).toBe('track1.bin');
      expect(files[1]?.filename).toBe('track2.bin');
    });

    it('should handle base path correctly', () => {
      const cueContent = `FILE "game.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00`;

      const files = parseCueContent(cueContent, '/path/to/files');
      
      expect(files[0]?.filename).toBe('/path/to/files/game.bin');
    });

    it('should throw Error for empty CUE content', () => {
      expect(() => parseCueContent('')).toThrow('Unable to parse any bin files in the cueSheet. Is it empty?');
    });

    it('should throw Error for invalid CUE content', () => {
      expect(() => parseCueContent('INVALID CONTENT')).toThrow('Unable to parse any bin files in the cueSheet. Is it empty?');
    });

    it('should handle different track types and set global blocksize', () => {
      const cueContent = `FILE "game.bin" BINARY
  TRACK 01 CDG
    INDEX 01 00:00:00`;

      parseCueContent(cueContent);
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Locked blocksize to 2448'));
    });

    it('should calculate sectors for single file correctly', () => {
      const cueContent = `FILE "game.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00
  TRACK 02 AUDIO
    INDEX 01 00:01:20`;

      const files = parseCueContent(cueContent);
      
      // Mock file size for testing
      if (files[0]) {
        files[0].size = 2352 * 100; // 100 sectors
      }
      
      // Re-parse to calculate sectors
      const filesWithSectors = parseCueContent(cueContent);
      expect(filesWithSectors[0]?.tracks[0]?.sectors).toBeDefined();
    });
  });

  describe('Cuesheet Generation', () => {
    it('should generate merged cuesheet correctly', () => {
      const files: BinFile[] = [
        {
          filename: 'track1.bin',
          size: 2352 * 100,
          tracks: [
            {
              num: 1,
              track_type: 'AUDIO',
              sectors: 100,
              indexes: [{ id: 1, stamp: '00:00:00', file_offset: 0 }]
            }
          ]
        },
        {
          filename: 'track2.bin',
          size: 2352 * 50,
          tracks: [
            {
              num: 2,
              track_type: 'AUDIO',
              sectors: 50,
              indexes: [{ id: 1, stamp: '00:00:00', file_offset: 0 }]
            }
          ]
        }
      ];

      const cuesheet = generateMergedCueSheet('merged', files);
      
      expect(cuesheet).toContain('FILE "merged.bin" BINARY');
      expect(cuesheet).toContain('TRACK 01 AUDIO');
      expect(cuesheet).toContain('TRACK 02 AUDIO');
    });

    it('should generate split cuesheet correctly', () => {
      const mergedFile: BinFile = {
        filename: 'merged.bin',
        size: 2352 * 150,
        tracks: [
          {
            num: 1,
            track_type: 'AUDIO',
            sectors: 100,
            indexes: [{ id: 1, stamp: '00:00:00', file_offset: 0 }]
          },
          {
            num: 2,
            track_type: 'AUDIO',
            sectors: 50,
            indexes: [{ id: 1, stamp: '00:01:20', file_offset: 100 }]
          }
        ]
      };

      const cuesheet = generateSplitCueSheet('split', mergedFile);
      
      expect(cuesheet).toContain('FILE "split (Track 1).bin" BINARY');
      expect(cuesheet).toContain('FILE "split (Track 2).bin" BINARY');
      expect(cuesheet).toContain('TRACK 01 AUDIO');
      expect(cuesheet).toContain('TRACK 02 AUDIO');
      expect(cuesheet).toContain('INDEX 01 00:00:00');
    });
  });

  describe('Main Operations', () => {
    it('should perform merge operation', () => {
      const cueContent = `FILE "track1.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00
FILE "track2.bin" BINARY
  TRACK 02 AUDIO
    INDEX 01 00:00:00`;

      const result = merge(cueContent, 'merged');
      
      expect(result.cueContent).toContain('FILE "merged.bin" BINARY');
      expect(result.cueContent).toContain('TRACK 01 AUDIO');
      expect(result.cueContent).toContain('TRACK 02 AUDIO');
      expect(result.files).toHaveLength(2);
    });

    it('should perform split operation', () => {
      const cueContent = `FILE "merged.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00
  TRACK 02 AUDIO
    INDEX 01 00:01:20`;

      const result = split(cueContent, 'split');
      
      expect(result.cueContent).toContain('FILE "split (Track 1).bin" BINARY');
      expect(result.cueContent).toContain('FILE "split (Track 2).bin" BINARY');
      expect(result.file.tracks).toHaveLength(2);
    });

    it('should throw error for split operation with multiple input files', () => {
      const cueContent = `FILE "track1.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00
FILE "track2.bin" BINARY
  TRACK 02 AUDIO
    INDEX 01 00:00:00`;

      expect(() => split(cueContent, 'split')).toThrow('Split operation requires exactly one input file');
    });

    it('should use custom blocksize when provided', () => {
      const cueContent = `FILE "track1.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00`;

      const result = merge(cueContent, 'merged', '', 2048);
      
      expect(result.cueContent).toContain('FILE "merged.bin" BINARY');
      expect(result.files).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid CUE content gracefully', () => {
      expect(() => parseCueContent('INVALID CONTENT')).toThrow('Unable to parse any bin files in the cueSheet. Is it empty?');
    });

    it('should handle malformed CUE content', () => {
      const malformedContent = `FILE "game.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 invalid_timestamp`;

      // This should not throw because the malformed timestamp is not processed
      // The parseCueContent method only processes valid INDEX lines
      expect(() => parseCueContent(malformedContent)).not.toThrow();
      
      // But if we try to parse the timestamp directly, it should throw
      expect(() => cueStampToSectors('invalid_timestamp')).toThrow('Invalid timestamp format: invalid_timestamp');
    });
  });
}); 