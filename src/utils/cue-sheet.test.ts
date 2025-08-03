import cueSheet from './cue-sheet';
const {
    generateMergedCueSheet,
    generateSplitCueSheet,
    parseFromCCDFile,
    processDirectory,
    deserializeCueSheet,
    serializeCueSheet,
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

const EXAMPLE_CUE_FILE = `
FILE "My Test File.BIN" BINARY
  TRACK 01 MODE2/2352 
    INDEX 01 00:00:00
`

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

describe('CUE File Serialization and Deserialization', () => {
    describe('deserializeCueSheet', () => {
        it('should parse EXAMPLE_CUE_FILE correctly', () => {
            const cueSheet = deserializeCueSheet(EXAMPLE_CUE_FILE);

            /* Verify file structure */
            expect(cueSheet.files).toHaveLength(1);
            expect(cueSheet.files[0].filename).toBe('My Test File.BIN');
            expect(cueSheet.files[0].type).toBe('BINARY');

            /* Verify track structure */
            expect(cueSheet.files[0].tracks).toHaveLength(1);
            expect(cueSheet.files[0].tracks[0].number).toBe(1);
            expect(cueSheet.files[0].tracks[0].type).toBe('MODE2/2352');

            /* Verify index structure */
            expect(cueSheet.files[0].tracks[0].indexes).toHaveLength(1);
            expect(cueSheet.files[0].tracks[0].indexes[0].id).toBe(1);
            expect(cueSheet.files[0].tracks[0].indexes[0].timestamp).toBe('00:00:00');
        });

        it('should parse CUE file with multiple tracks', () => {
            const multiTrackCue = `
FILE "game.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00
  TRACK 02 AUDIO
    INDEX 01 00:02:30
    INDEX 02 00:04:15
  TRACK 03 MODE1/2352
    INDEX 01 00:06:00
`;

            const cueSheet = deserializeCueSheet(multiTrackCue);

            expect(cueSheet.files).toHaveLength(1);
            expect(cueSheet.files[0].filename).toBe('game.bin');
            expect(cueSheet.files[0].tracks).toHaveLength(3);

            /* Verify first track */
            expect(cueSheet.files[0].tracks[0].number).toBe(1);
            expect(cueSheet.files[0].tracks[0].type).toBe('AUDIO');
            expect(cueSheet.files[0].tracks[0].indexes).toHaveLength(1);
            expect(cueSheet.files[0].tracks[0].indexes[0].timestamp).toBe('00:00:00');

            /* Verify second track with multiple indexes */
            expect(cueSheet.files[0].tracks[1].number).toBe(2);
            expect(cueSheet.files[0].tracks[1].type).toBe('AUDIO');
            expect(cueSheet.files[0].tracks[1].indexes).toHaveLength(2);
            expect(cueSheet.files[0].tracks[1].indexes[0].timestamp).toBe('00:02:30');
            expect(cueSheet.files[0].tracks[1].indexes[1].timestamp).toBe('00:04:15');

            /* Verify third track */
            expect(cueSheet.files[0].tracks[2].number).toBe(3);
            expect(cueSheet.files[0].tracks[2].type).toBe('MODE1/2352');
        });

        it('should parse CUE file with metadata', () => {
            const cueWithMetadata = `
TITLE "Test Album"
PERFORMER "Test Artist"
SONGWRITER "Test Composer"
CATALOG 1234567890123
ISRC ABC123456789
REM COMMENT "Test comment"
FILE "album.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00
`;

            const cueSheet = deserializeCueSheet(cueWithMetadata);

            /* Verify metadata */
            expect(cueSheet.metadata).toBeDefined();
            expect(cueSheet.metadata?.title).toBe('Test Album');
            expect(cueSheet.metadata?.performer).toBe('Test Artist');
            expect(cueSheet.metadata?.songwriter).toBe('Test Composer');
            expect(cueSheet.metadata?.catalog).toBe('1234567890123');
            expect(cueSheet.metadata?.isrc).toBe('ABC123456789');
            expect(cueSheet.metadata?.comment).toBe('Test comment');

            /* Verify file structure */
            expect(cueSheet.files).toHaveLength(1);
            expect(cueSheet.files[0].filename).toBe('album.bin');
        });

        it('should handle CUE file with multiple files', () => {
            const multiFileCue = `
FILE "track1.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00
FILE "track2.bin" BINARY
  TRACK 02 AUDIO
    INDEX 01 00:00:00
`;

            const cueSheet = deserializeCueSheet(multiFileCue);

            expect(cueSheet.files).toHaveLength(2);
            expect(cueSheet.files[0].filename).toBe('track1.bin');
            expect(cueSheet.files[1].filename).toBe('track2.bin');
            expect(cueSheet.files[0].tracks).toHaveLength(1);
            expect(cueSheet.files[1].tracks).toHaveLength(1);
        });

        it('should handle empty lines and whitespace', () => {
            const cueWithWhitespace = `

FILE "test.bin" BINARY

  TRACK 01 AUDIO

    INDEX 01 00:00:00

`;

            const cueSheet = deserializeCueSheet(cueWithWhitespace);

            expect(cueSheet.files).toHaveLength(1);
            expect(cueSheet.files[0].filename).toBe('test.bin');
            expect(cueSheet.files[0].tracks).toHaveLength(1);
            expect(cueSheet.files[0].tracks[0].indexes).toHaveLength(1);
        });
    });

    describe('serializeCueSheet', () => {
        it('should serialize EXAMPLE_CUE_FILE structure correctly', () => {
            const cueSheet = deserializeCueSheet(EXAMPLE_CUE_FILE);
            const serialized = serializeCueSheet(cueSheet);

            /* Verify the serialized content matches the original */
            expect(serialized).toContain('FILE "My Test File.BIN" BINARY');
            expect(serialized).toContain('TRACK 01 MODE2/2352');
            expect(serialized).toContain('INDEX 01 00:00:00');
        });

        it('should serialize CUE sheet with metadata', () => {
            const cueSheet = {
                files: [{
                    filename: 'album.bin',
                    type: 'BINARY',
                    tracks: [{
                        number: 1,
                        type: 'AUDIO',
                        indexes: [{
                            id: 1,
                            timestamp: '00:00:00'
                        }]
                    }]
                }],
                metadata: {
                    title: 'Test Album',
                    performer: 'Test Artist',
                    songwriter: 'Test Composer',
                    catalog: '1234567890123',
                    isrc: 'ABC123456789',
                    comment: 'Test comment'
                }
            };

            const serialized = serializeCueSheet(cueSheet);

            expect(serialized).toContain('TITLE "Test Album"');
            expect(serialized).toContain('PERFORMER "Test Artist"');
            expect(serialized).toContain('SONGWRITER "Test Composer"');
            expect(serialized).toContain('CATALOG 1234567890123');
            expect(serialized).toContain('ISRC ABC123456789');
            expect(serialized).toContain('REM COMMENT "Test comment"');
            expect(serialized).toContain('FILE "album.bin" BINARY');
            expect(serialized).toContain('TRACK 01 AUDIO');
            expect(serialized).toContain('INDEX 01 00:00:00');
        });

        it('should serialize CUE sheet without metadata', () => {
            const cueSheet = {
                files: [{
                    filename: 'game.bin',
                    type: 'BINARY',
                    tracks: [{
                        number: 1,
                        type: 'MODE1/2352',
                        indexes: [{
                            id: 1,
                            timestamp: '00:00:00'
                        }]
                    }]
                }]
            };

            const serialized = serializeCueSheet(cueSheet);

            expect(serialized).toContain('FILE "game.bin" BINARY');
            expect(serialized).toContain('TRACK 01 MODE1/2352');
            expect(serialized).toContain('INDEX 01 00:00:00');
            expect(serialized).not.toContain('TITLE');
            expect(serialized).not.toContain('PERFORMER');
        });

        it('should serialize multiple tracks with proper formatting', () => {
            const cueSheet = {
                files: [{
                    filename: 'album.bin',
                    type: 'BINARY',
                    tracks: [
                        {
                            number: 1,
                            type: 'AUDIO',
                            indexes: [{
                                id: 1,
                                timestamp: '00:00:00'
                            }]
                        },
                        {
                            number: 2,
                            type: 'AUDIO',
                            indexes: [
                                { id: 1, timestamp: '00:02:30' },
                                { id: 2, timestamp: '00:04:15' }
                            ]
                        }
                    ]
                }]
            };

            const serialized = serializeCueSheet(cueSheet);

            expect(serialized).toContain('TRACK 01 AUDIO');
            expect(serialized).toContain('TRACK 02 AUDIO');
            expect(serialized).toContain('INDEX 01 00:00:00');
            expect(serialized).toContain('INDEX 01 00:02:30');
            expect(serialized).toContain('INDEX 02 00:04:15');
        });

        it('should round-trip serialize and deserialize correctly', () => {
            const originalCue = `
TITLE "Test Album"
PERFORMER "Test Artist"
FILE "album.bin" BINARY
  TRACK 01 AUDIO
    INDEX 01 00:00:00
  TRACK 02 AUDIO
    INDEX 01 00:02:30
    INDEX 02 00:04:15
`;

            const cueSheet = deserializeCueSheet(originalCue);
            const serialized = serializeCueSheet(cueSheet);
            const roundTripCueSheet = deserializeCueSheet(serialized);

            /* Verify the round-trip preserves the structure */
            expect(roundTripCueSheet.files).toHaveLength(cueSheet.files.length);
            expect(roundTripCueSheet.files[0].filename).toBe(cueSheet.files[0].filename);
            expect(roundTripCueSheet.files[0].tracks).toHaveLength(cueSheet.files[0].tracks.length);
            expect(roundTripCueSheet.metadata?.title).toBe(cueSheet.metadata?.title);
            expect(roundTripCueSheet.metadata?.performer).toBe(cueSheet.metadata?.performer);
        });
    });
});
