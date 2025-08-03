import cueSheet from './cue-sheet';
const {
    generateMergedCueSheet,
    generateSplitCueSheet,
    parseFromCCDFile,
    processDirectory,
} = cueSheet;
import type { BinFile } from './binmerge';
import path from 'node:path';
import storage from './storage';
import type { IStorage } from './storage.interface';
import { guardFileDoesNotExist } from './guard';

const EXAMPLE_CCD_FILE = `
[CloneCD]
Version=3
[Disc]
TocEntries=4
Sessions=1
DataTracksScrambled=0
CDTextLength=0
[Session 1]
PreGapMode=2
PreGapSubC=1
[Entry 0]
Session=1
Point=0xa0
ADR=0x01
Control=0x00
TrackNo=0
AMin=0
ASec=0
AFrame=0
ALBA=-150
Zero=0
PMin=1
PSec=32
PFrame=0
PLBA=6750
[Entry 1]
Session=1
Point=0xa1
ADR=0x01
Control=0x00
TrackNo=0
AMin=0
ASec=0
AFrame=0
ALBA=-150
Zero=0
PMin=1
PSec=0
PFrame=0
PLBA=4350
[Entry 2]
Session=1
Point=0xa2
ADR=0x01
Control=0x00
TrackNo=0
AMin=0
ASec=0
AFrame=0
ALBA=-150
Zero=0
PMin=68
PSec=57
PFrame=4
PLBA=310129
[Entry 3]
Session=1
Point=0x01
ADR=0x01
Control=0x04
TrackNo=0
AMin=0
ASec=0
AFrame=0
ALBA=-150
Zero=0
PMin=0
PSec=2
PFrame=0
PLBA=0
[TRACK 1]
MODE=2
INDEX 1=0
`;

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
                            indexes: [
                                { id: 1, stamp: '00:00:00', file_offset: 0 },
                            ],
                        },
                    ],
                },
                {
                    filename: 'track2.bin',
                    size: 2352 * 100,
                    tracks: [
                        {
                            num: 2,
                            track_type: 'AUDIO',
                            indexes: [
                                { id: 1, stamp: '00:00:00', file_offset: 0 },
                            ],
                        },
                    ],
                },
            ];

            const cueSheet = generateMergedCueSheet('merged', files);

            expect(cueSheet).toContain('FILE "merged.bin" BINARY');
            expect(cueSheet).toContain('TRACK 01 AUDIO');
            expect(cueSheet).toContain('TRACK 02 AUDIO');
            expect(cueSheet).toContain('INDEX 01 00:00:00');
            expect(cueSheet).toContain(
                'INDEX 01 00:01:25'
            ); /* 100 sectors later */
        });

        it('should use custom blocksize when provided', () => {
            const files: BinFile[] = [
                {
                    filename: 'track1.bin',
                    size: 2048 * 100 /* Using 2048 blocksize */,
                    tracks: [
                        {
                            num: 1,
                            track_type: 'MODE1/2048',
                            indexes: [
                                { id: 1, stamp: '00:00:00', file_offset: 0 },
                            ],
                        },
                    ],
                },
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
                        indexes: [{ id: 1, stamp: '00:00:00', file_offset: 0 }],
                    },
                    {
                        num: 2,
                        track_type: 'AUDIO',
                        sectors: 100,
                        indexes: [
                            { id: 1, stamp: '00:01:20', file_offset: 100 },
                        ],
                    },
                ],
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
                        indexes: [{ id: 1, stamp: '00:00:00', file_offset: 0 }],
                    },
                ],
            };

            const cueSheet = generateSplitCueSheet('split', mergedFile);

            expect(cueSheet).toContain(
                'FILE "split.bin" BINARY'
            ); /* Single track uses simple name */
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
                    indexes: [
                        { id: 1, stamp: '00:00:00', file_offset: i * 100 },
                    ],
                })),
            };

            const cueSheet = generateSplitCueSheet('split', mergedFile);

            /* Should use 2-digit numbering for 10+ tracks */
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
        /* Create a test BIN file */
        const binFilePath = path.join(testDir, 'test.bin');
        const cueFilePath = path.join(testDir, 'test.cue');
        const testContent = new TextEncoder().encode('Test BIN content');
        await storageInstance.write(binFilePath, testContent);

        /* Create the CUE file */
        await cueSheet.createCueFile(binFilePath, cueFilePath);

        /* Verify the CUE file was created */
        const cueExists = await storageInstance.exists(cueFilePath);
        expect(cueExists).toBe(true);

        /* Verify the CUE content */
        const cueContent = await storageInstance.read(cueFilePath);
        const cueText = new TextDecoder().decode(cueContent);
        expect(cueText).toBe(
            'FILE "test.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00'
        );
    });

    it('should throw error if BIN file does not exist', async () => {
        const nonExistentBinPath = path.join(testDir, 'nonexistent.bin');
        /* Remove the file if it exists */
        await storageInstance.remove(nonExistentBinPath).catch(() => {
            /* ignore */
        });
        guardFileDoesNotExist(
            nonExistentBinPath,
            `Bin file should not exist: ${nonExistentBinPath}`
        );
        const cueFilePath = path.join(testDir, 'test.cue');

        await expect(
            cueSheet.createCueFile(nonExistentBinPath, cueFilePath)
        ).rejects.toThrow('Bin file does not exist: ' + nonExistentBinPath);
    });

    it('should use correct BIN filename in CUE content', async () => {
        /* Create a test BIN file with a different name */
        const binFilePath = path.join(testDir, 'game.bin');
        const cueFilePath = path.join(testDir, 'game.cue');
        const testContent = new TextEncoder().encode('Test BIN content');
        await storageInstance.write(binFilePath, testContent);

        /* Create the CUE file */
        await cueSheet.createCueFile(binFilePath, cueFilePath);

        /* Verify the CUE content uses the correct filename */
        const cueContent = await storageInstance.read(cueFilePath);
        const cueText = new TextDecoder().decode(cueContent);
        expect(cueText).toContain('FILE "game.bin" BINARY');
    });
});

describe('parseFromCCDFile', () => {
    let testDir: string;
    let storageInstance: IStorage;

    beforeEach(async () => {
        storageInstance = await storage();
        testDir = await storageInstance.createTemporaryDirectory();
    });

    afterEach(async () => {
        await storageInstance.remove(testDir);
    });

    it('should convert CCD file to CUE format', async () => {
        /* Create a test CCD file */
        const ccdFilePath = path.join(testDir, 'test.ccd');
        await storageInstance.write(
            ccdFilePath,
            new TextEncoder().encode(EXAMPLE_CCD_FILE)
        );

        /* Create a dummy image file to satisfy the function */
        const imgFilePath = path.join(testDir, 'test.img');
        await storageInstance.write(
            imgFilePath,
            new TextEncoder().encode('dummy image content')
        );

        /* Convert CCD to CUE */
        const cueContent = await parseFromCCDFile(ccdFilePath);

        /* Verify the CUE content */
        expect(cueContent).toContain('FILE "test.img" BINARY');
        expect(cueContent).toContain('TRACK 01 MODE1/2352');
        expect(cueContent).toContain('INDEX 01 00:00:00');

        /* Verify the timing adjustment logic worked */
        expect(cueContent).toContain(
            'INDEX 01 00:00:00'
        ); /* PLBA=0 should be 00:00:00 */
    });

    it('should throw error for non-CCD file', async () => {
        const nonCcdPath = path.join(testDir, 'test.txt');
        await storageInstance.write(
            nonCcdPath,
            new TextEncoder().encode('not a ccd file')
        );

        await expect(parseFromCCDFile(nonCcdPath)).rejects.toThrow(
            'File must have .ccd extension: ' + nonCcdPath
        );
    });

    it('should throw error if CCD file does not exist', async () => {
        const nonExistentPath = path.join(testDir, 'nonexistent.ccd');

        await expect(parseFromCCDFile(nonExistentPath)).rejects.toThrow(
            'CCD file does not exist: ' + nonExistentPath
        );
    });

    it('should throw error if no image file found', async () => {
        /* Create CCD file without corresponding image file */
        const ccdFilePath = path.join(testDir, 'test.ccd');
        await storageInstance.write(
            ccdFilePath,
            new TextEncoder().encode(EXAMPLE_CCD_FILE)
        );

        await expect(parseFromCCDFile(ccdFilePath)).rejects.toThrow(
            'No image file found for CCD: ' + ccdFilePath
        );
    });
});

describe('processDirectory', () => {
    let testDir: string;
    let storageInstance: IStorage;

    beforeEach(async () => {
        storageInstance = await storage();
        testDir = await storageInstance.createTemporaryDirectory();
    });

    afterEach(async () => {
        await storageInstance.remove(testDir);
    });

    it('should process CCD files in directory', async () => {
        /* Create test CCD and image files */
        const ccdFilePath = path.join(testDir, 'test.ccd');
        const imgFilePath = path.join(testDir, 'test.img');

        await storageInstance.write(
            ccdFilePath,
            new TextEncoder().encode(EXAMPLE_CCD_FILE)
        );
        await storageInstance.write(
            imgFilePath,
            new TextEncoder().encode('dummy image content')
        );

        /* Process directory */
        const result = await processDirectory(testDir);

        /* Verify results */
        expect(result.status).toBe(true);
        expect(result.result).toHaveLength(1);
        expect(result.result[0]).toContain('test.cue');

        /* Verify CUE file was created */
        const cueFilePath = path.join(testDir, 'test.cue');
        const cueExists = await storageInstance.exists(cueFilePath);
        expect(cueExists).toBe(true);

        /* Verify CUE content */
        const cueContent = await storageInstance.read(cueFilePath);
        const cueText = new TextDecoder().decode(cueContent);
        expect(cueText).toContain('FILE "test.img" BINARY');
        expect(cueText).toContain('TRACK 01 MODE1/2352');
    });

    it('should process BIN files in directory', async () => {
        /* Create test BIN file */
        const binFilePath = path.join(testDir, 'test.bin');
        await storageInstance.write(
            binFilePath,
            new TextEncoder().encode('dummy bin content')
        );

        /* Process directory */
        const result = await processDirectory(testDir);

        /* Verify results */
        expect(result.status).toBe(true);
        expect(result.result).toHaveLength(1);
        expect(result.result[0]).toContain('test.cue');

        /* Verify CUE file was created */
        const cueFilePath = path.join(testDir, 'test.cue');
        const cueExists = await storageInstance.exists(cueFilePath);
        expect(cueExists).toBe(true);
    });

    it('should skip BIN files if CUE already exists', async () => {
        /* Create test BIN file and existing CUE file */
        const binFilePath = path.join(testDir, 'test.bin');
        const cueFilePath = path.join(testDir, 'test.cue');

        await storageInstance.write(
            binFilePath,
            new TextEncoder().encode('dummy bin content')
        );
        await storageInstance.write(
            cueFilePath,
            new TextEncoder().encode('existing cue content')
        );

        /* Process directory */
        const result = await processDirectory(testDir);

        /* Should not process anything since CUE already exists */
        expect(result.status).toBe(false);
        expect(result.result).toHaveLength(0);
    });

    it('should process multiple file types in priority order', async () => {
        /* Create both CCD and BIN files */
        const ccdFilePath = path.join(testDir, 'test.ccd');
        const imgFilePath = path.join(testDir, 'test.img');
        const binFilePath = path.join(testDir, 'other.bin');

        await storageInstance.write(
            ccdFilePath,
            new TextEncoder().encode(EXAMPLE_CCD_FILE)
        );
        await storageInstance.write(
            imgFilePath,
            new TextEncoder().encode('dummy image content')
        );
        await storageInstance.write(
            binFilePath,
            new TextEncoder().encode('dummy bin content')
        );

        /* Process directory */
        const result = await processDirectory(testDir);

        /* Should process both CCD and BIN files */
        expect(result.status).toBe(true);
        expect(result.result).toHaveLength(2);
        expect(result.result.some(path => path.includes('test.cue'))).toBe(
            true
        );
        expect(result.result.some(path => path.includes('other.cue'))).toBe(
            true
        );
    });

    it('should return false status when no processable files found', async () => {
        /* Create non-processable files */
        const txtFilePath = path.join(testDir, 'test.txt');
        await storageInstance.write(
            txtFilePath,
            new TextEncoder().encode('text content')
        );

        /* Process directory */
        const result = await processDirectory(testDir);

        /* Should not process anything */
        expect(result.status).toBe(false);
        expect(result.result).toHaveLength(0);
    });

    it('should throw error for non-existent directory', async () => {
        const nonExistentDir = path.join(testDir, 'nonexistent');

        await expect(processDirectory(nonExistentDir)).rejects.toThrow(
            'Directory does not exist: ' + nonExistentDir
        );
    });
});
