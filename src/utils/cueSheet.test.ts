import cueSheet from './cueSheet';
const { generateMergedCueSheet, generateSplitCueSheet } = cueSheet;
import type { BinFile } from './binmerge';
import { join } from 'node:path';
import storage from './storage';
import type { IStorage } from './storage';
import { guardFileDoesNotExist } from './guard';

describe('CueSheet Generation', () => {
  describe('generateMergedCueSheet', () => {
    it('should generate merged cueSheet correctly', () => {
      const files: BinFile[] = [
        {
          filename: 'track1.bin',
          size: 2352 * 100,
          tracks: [
            {
              num: 1,
              track_type: 'AUDIO',
              indexes: [{ id: 1, stamp: '00:00:00', file_offset: 0 }]
            }
          ]
        },
        {
          filename: 'track2.bin',
          size: 2352 * 100,
          tracks: [
            {
              num: 2,
              track_type: 'AUDIO',
              indexes: [{ id: 1, stamp: '00:00:00', file_offset: 0 }]
            }
          ]
        }
      ];

      const cueSheet = generateMergedCueSheet('merged', files);
      
      expect(cueSheet).toContain('FILE "merged.bin" BINARY');
      expect(cueSheet).toContain('TRACK 01 AUDIO');
      expect(cueSheet).toContain('TRACK 02 AUDIO');
      expect(cueSheet).toContain('INDEX 01 00:00:00');
      expect(cueSheet).toContain('INDEX 01 00:01:25'); // 100 sectors later
    });

    it('should use custom blocksize when provided', () => {
      const files: BinFile[] = [
        {
          filename: 'track1.bin',
          size: 2048 * 100, // Using 2048 blocksize
          tracks: [
            {
              num: 1,
              track_type: 'MODE1/2048',
              indexes: [{ id: 1, stamp: '00:00:00', file_offset: 0 }]
            }
          ]
        }
      ];

      const cueSheet = generateMergedCueSheet('merged', files, 2048);
      
      expect(cueSheet).toContain('FILE "merged.bin" BINARY');
      expect(cueSheet).toContain('TRACK 01 MODE1/2048');
      expect(cueSheet).toContain('INDEX 01 00:00:00');
    });
  });

  describe('generateSplitCueSheet', () => {
    it('should generate split cueSheet correctly', () => {
      const mergedFile: BinFile = {
        filename: 'merged.bin',
        size: 2352 * 200,
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
            sectors: 100,
            indexes: [{ id: 1, stamp: '00:01:20', file_offset: 100 }]
          }
        ]
      };

      const cueSheet = generateSplitCueSheet('split', mergedFile);
      
      expect(cueSheet).toContain('FILE "split (Track 1).bin" BINARY');
      expect(cueSheet).toContain('FILE "split (Track 2).bin" BINARY');
      expect(cueSheet).toContain('TRACK 01 AUDIO');
      expect(cueSheet).toContain('TRACK 02 AUDIO');
      expect(cueSheet).toContain('INDEX 01 00:00:00');
    });

    it('should handle single track correctly', () => {
      const mergedFile: BinFile = {
        filename: 'merged.bin',
        size: 2352 * 100,
        tracks: [
          {
            num: 1,
            track_type: 'AUDIO',
            sectors: 100,
            indexes: [{ id: 1, stamp: '00:00:00', file_offset: 0 }]
          }
        ]
      };

      const cueSheet = generateSplitCueSheet('split', mergedFile);
      
      expect(cueSheet).toContain('FILE "split.bin" BINARY'); // Single track uses simple name
      expect(cueSheet).toContain('TRACK 01 AUDIO');
      expect(cueSheet).toContain('INDEX 01 00:00:00');
    });

    it('should handle many tracks with proper numbering', () => {
      const mergedFile: BinFile = {
        filename: 'merged.bin',
        size: 2352 * 1000,
        tracks: Array.from({ length: 15 }, (_, i) => ({
          num: i + 1,
          track_type: 'AUDIO',
          sectors: 100,
          indexes: [{ id: 1, stamp: '00:00:00', file_offset: i * 100 }]
        }))
      };

      const cueSheet = generateSplitCueSheet('split', mergedFile);
      
      // Should use 2-digit numbering for 10+ tracks
      expect(cueSheet).toContain('FILE "split (Track 01).bin" BINARY');
      expect(cueSheet).toContain('FILE "split (Track 10).bin" BINARY');
      expect(cueSheet).toContain('FILE "split (Track 15).bin" BINARY');
    });
  });
}); 

describe('createCueFile', () => {
    let testDir: string;
    let storageInstance: IStorage;

    beforeEach(async () => {
        storageInstance = await storage();
        testDir = await storageInstance.createTemporaryDirectory();
    });

    afterEach(async () => {
        await storageInstance.remove(testDir);
    });

    it('should create a CUE file for a BIN file', async () => {
        // Create a test BIN file
        const binFilePath = join(testDir, 'test.bin');
        const cueFilePath = join(testDir, 'test.cue');
        const testContent = new TextEncoder().encode('Test BIN content');
        await storageInstance.write(binFilePath, testContent);

        // Create the CUE file
        await cueSheet.createCueFile(binFilePath, cueFilePath);

        // Verify the CUE file was created
        const cueExists = await storageInstance.exists(cueFilePath);
        expect(cueExists).toBe(true);

        // Verify the CUE content
        const cueContent = await storageInstance.read(cueFilePath);
        const cueText = new TextDecoder().decode(cueContent);
        expect(cueText).toBe('FILE "test.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00');
    });

    it('should throw error if BIN file does not exist', async () => {
        const nonExistentBinPath = join(testDir, 'nonexistent.bin');
        // Remove the file if it exists
        await storageInstance.remove(nonExistentBinPath).catch(() => {
          /* ignore */
        });
        guardFileDoesNotExist(nonExistentBinPath, `Bin file should not exist: ${nonExistentBinPath}`);
        const cueFilePath = join(testDir, 'test.cue');

        await expect(cueSheet.createCueFile(nonExistentBinPath, cueFilePath))
            .rejects.toThrow('Bin file does not exist: ' + nonExistentBinPath);
    });

    it('should use correct BIN filename in CUE content', async () => {
        // Create a test BIN file with a different name
        const binFilePath = join(testDir, 'game.bin');
        const cueFilePath = join(testDir, 'game.cue');
        const testContent = new TextEncoder().encode('Test BIN content');
        await storageInstance.write(binFilePath, testContent);

        // Create the CUE file
        await cueSheet.createCueFile(binFilePath, cueFilePath);

        // Verify the CUE content uses the correct filename
        const cueContent = await storageInstance.read(cueFilePath);
        const cueText = new TextDecoder().decode(cueContent);
        expect(cueText).toContain('FILE "game.bin" BINARY');
    });
}); 