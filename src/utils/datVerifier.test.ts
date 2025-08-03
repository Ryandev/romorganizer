import { 
    VerificationException, 
    ConversionException, 
    CueVerificationResult, 
    VerificationResult,
    convertChdToNormalizedRedumpDumpFolder,
    verifyChd,
    stripInsignificantWhitespaceAndChdmanUnsupportedCommandsFromCue
} from './datVerifier';
import { log } from './logger';
import storage from './storage';
import chd from './chd';

/* Mock dependencies */
jest.mock('zx', () => ({
    $: jest.fn(),
}));

jest.mock('./logger', () => ({
    log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('./storage', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('./chd', () => ({
    __esModule: true,
    default: {
        extract: jest.fn(),
    },
}));

jest.mock('./hash', () => ({
    __esModule: true,
    default: {
        calculateFileSha1: jest.fn(),
    },
}));

jest.mock('./dat', () => ({
    Dat: jest.fn(),
    Game: jest.fn(),
    ROM: jest.fn(),
}));

describe('datVerifier.ts', () => {
    const mockLog = log as jest.Mocked<typeof log>;
    const mockStorage = storage as jest.MockedFunction<typeof storage>;
    const mockChd = chd as jest.Mocked<typeof chd>;
    const mock$ = require('zx').$ as jest.MockedFunction<typeof import('zx').$>;
    const mockHash = require('./hash') as jest.Mocked<typeof import('./hash')>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        /* Setup storage mock with all required methods */
        mockStorage.mockReturnValue({
            createTemporaryDirectory: jest.fn().mockResolvedValue('/temp/dir'),
            list: jest.fn().mockResolvedValue([]),
            copy: jest.fn().mockResolvedValue(undefined),
            exists: jest.fn().mockResolvedValue(true),
            readFile: jest.fn().mockResolvedValue(''),
            writeFile: jest.fn().mockResolvedValue(undefined),
            deleteFile: jest.fn().mockResolvedValue(undefined),
            deleteDirectory: jest.fn().mockResolvedValue(undefined),
            createDirectory: jest.fn().mockResolvedValue(undefined),
            move: jest.fn().mockResolvedValue(undefined),
            remove: jest.fn().mockResolvedValue(undefined),
            read: jest.fn().mockResolvedValue(new TextEncoder().encode('')),
            write: jest.fn().mockResolvedValue(undefined),
            getFileSize: jest.fn().mockResolvedValue(0),
            getFileStats: jest.fn().mockResolvedValue({
                size: 0,
                mtime: new Date(),
                isFile: () => true,
                isDirectory: () => false,
            }),
        } as any);

        /* Setup zx mock */
        (mock$ as any).mockResolvedValue({
            stdout: 'binmerge output',
            exitCode: 0,
        });

        /* Setup hash mock */
        (mockHash as any).default.calculateFileSha1.mockResolvedValue('a1b2c3d4e5f6');
    });

    describe('VerificationException', () => {
        it('should create VerificationException with correct properties', () => {
            /* Arrange & Act */
            const exception = new VerificationException('Test error message');

            /* Assert */
            expect(exception).toBeInstanceOf(Error);
            expect(exception).toBeInstanceOf(VerificationException);
            expect(exception.name).toBe('VerificationException');
            expect(exception.message).toBe('Test error message');
        });
    });

    describe('ConversionException', () => {
        it('should create ConversionException with correct properties', () => {
            /* Arrange & Act */
            const exception = new ConversionException(
                'Conversion failed',
                '/test/converted.chd',
                'Tool output here'
            );

            /* Assert */
            expect(exception).toBeInstanceOf(Error);
            expect(exception).toBeInstanceOf(ConversionException);
            expect(exception.name).toBe('ConversionException');
            expect(exception.message).toBe('Conversion failed');
            expect(exception.convertedFilePath).toBe('/test/converted.chd');
            expect(exception.toolOutput).toBe('Tool output here');
        });

        it('should create ConversionException without tool output', () => {
            /* Arrange & Act */
            const exception = new ConversionException(
                'Conversion failed',
                '/test/converted.chd'
            );

            /* Assert */
            expect(exception).toBeInstanceOf(ConversionException);
            expect(exception.convertedFilePath).toBe('/test/converted.chd');
            expect(exception.toolOutput).toBeUndefined();
        });
    });

    describe('CueVerificationResult', () => {
        it('should have all expected enum values', () => {
            /* Assert */
            expect(CueVerificationResult.NO_CUE_NEEDED).toBe('NO_CUE_NEEDED');
            expect(CueVerificationResult.GENERATED_CUE_VERIFIED_EXACTLY).toBe('GENERATED_CUE_VERIFIED_EXACTLY');
            expect(CueVerificationResult.GENERATED_CUE_MATCHES_ESSENTIALS_FROM_EXTRA_CUE).toBe('GENERATED_CUE_MATCHES_ESSENTIALS_FROM_EXTRA_CUE');
            expect(CueVerificationResult.GENERATED_CUE_MISMATCH_WITH_NO_EXTRA_CUE_PROVIDED).toBe('GENERATED_CUE_MISMATCH_WITH_NO_EXTRA_CUE_PROVIDED');
            expect(CueVerificationResult.GENERATED_CUE_DOES_NOT_MATCH_ESSENTIALS_FROM_EXTRA_CUE).toBe('GENERATED_CUE_DOES_NOT_MATCH_ESSENTIALS_FROM_EXTRA_CUE');
        });
    });

    describe('VerificationResult', () => {
        it('should create VerificationResult with correct properties', () => {
            /* Arrange */
            const mockGame = {
                name: 'Test Game',
                files: [],
            } as any;

            /* Act */
            const result = new VerificationResult(
                mockGame,
                CueVerificationResult.NO_CUE_NEEDED
            );

            /* Assert */
            expect(result.game).toBe(mockGame);
            expect(result.cueVerificationResult).toBe(CueVerificationResult.NO_CUE_NEEDED);
        });
    });

    describe('stripInsignificantWhitespaceAndChdmanUnsupportedCommandsFromCue', () => {
        it('should strip whitespace and unsupported commands', () => {
            /* Arrange */
            const cueText = `
                FILE "test.bin" BINARY
                TRACK 01 MODE1/2352
                    INDEX 01 00:00:00
                REM This is a comment
                CATALOG 1234567890123
                CDTEXTFILE "test.cdt"
            `;

            /* Act */
            const result = stripInsignificantWhitespaceAndChdmanUnsupportedCommandsFromCue(cueText);

            /* Assert */
            expect(result).toBe('FILE "test.bin" BINARY\nTRACK 01 MODE1/2352\nINDEX 01 00:00:00');
        });

        it('should handle empty input', () => {
            /* Arrange */
            const cueText = '';

            /* Act */
            const result = stripInsignificantWhitespaceAndChdmanUnsupportedCommandsFromCue(cueText);

            /* Assert */
            expect(result).toBe('');
        });

        it('should handle input with only unsupported commands', () => {
            /* Arrange */
            const cueText = `
                REM This is a comment
                CATALOG 1234567890123
                CDTEXTFILE "test.cdt"
            `;

            /* Act */
            const result = stripInsignificantWhitespaceAndChdmanUnsupportedCommandsFromCue(cueText);

            /* Assert */
            expect(result).toBe('');
        });

        it('should handle mixed case commands', () => {
            /* Arrange */
            const cueText = `
                file "test.bin" BINARY
                track 01 MODE1/2352
                    index 01 00:00:00
            `;

            /* Act */
            const result = stripInsignificantWhitespaceAndChdmanUnsupportedCommandsFromCue(cueText);

            /* Assert */
            expect(result).toBe('file "test.bin" BINARY\ntrack 01 MODE1/2352\nindex 01 00:00:00');
        });

        it('should handle all supported commands', () => {
            /* Arrange */
            const cueText = `
                FILE "test.bin" BINARY
                TRACK 01 MODE1/2352
                PREGAP 00:02:00
                INDEX 01 00:00:00
                POSTGAP 00:02:00
            `;

            /* Act */
            const result = stripInsignificantWhitespaceAndChdmanUnsupportedCommandsFromCue(cueText);

            /* Assert */
            expect(result).toBe('FILE "test.bin" BINARY\nTRACK 01 MODE1/2352\nPREGAP 00:02:00\nINDEX 01 00:00:00\nPOSTGAP 00:02:00');
        });
    });

    describe('convertChdToNormalizedRedumpDumpFolder', () => {
        it('should convert CHD to normalized Redump dump folder', async () => {
            /* Arrange */
            const chdPath = '/test/game.chd';
            const redumpDumpFolder = '/test/output';
            const mockExtractedCuePath = '/temp/extracted.cue';
            
            mockChd.extract.mockResolvedValue(mockExtractedCuePath);
            mockStorage.mockReturnValue({
                createTemporaryDirectory: jest.fn().mockResolvedValue('/temp/dir'),
                list: jest.fn().mockResolvedValue(['/temp/extracted.cue', '/temp/extracted.bin']),
                copy: jest.fn().mockResolvedValue(undefined),
                createDirectory: jest.fn().mockResolvedValue(undefined),
                exists: jest.fn().mockResolvedValue(true),
                readFile: jest.fn().mockResolvedValue(''),
                writeFile: jest.fn().mockResolvedValue(undefined),
                deleteFile: jest.fn().mockResolvedValue(undefined),
                deleteDirectory: jest.fn().mockResolvedValue(undefined),
                move: jest.fn().mockResolvedValue(undefined),
                remove: jest.fn().mockResolvedValue(undefined),
                read: jest.fn().mockResolvedValue(new TextEncoder().encode('')),
                write: jest.fn().mockResolvedValue(undefined),
                getFileSize: jest.fn().mockResolvedValue(0),
                getFileStats: jest.fn().mockResolvedValue({
                    size: 0,
                    mtime: new Date(),
                    isFile: () => true,
                    isDirectory: () => false,
                }),
            } as any);

            /* Act */
            await convertChdToNormalizedRedumpDumpFolder(chdPath, redumpDumpFolder);

            /* Assert */
            expect(mockChd.extract).toHaveBeenCalledWith({
                chdFilePath: chdPath,
                format: 'cue',
            });
            expect(mockLog.info).toHaveBeenCalledWith('Converting "game.chd" to .bin/.cue format');
        });

        it('should handle conversion errors', async () => {
            /* Arrange */
            const chdPath = '/test/game.chd';
            const redumpDumpFolder = '/test/output';
            const error = new Error('CHD extraction failed');
            
            mockChd.extract.mockRejectedValue(error);

            /* Act & Assert */
            await expect(convertChdToNormalizedRedumpDumpFolder(chdPath, redumpDumpFolder)).rejects.toThrow('Failed to convert .chd using existing CHD implementation');
        });
    });

    describe('verifyChd', () => {
        it('should verify CHD file successfully', async () => {
            /* Arrange */
            const chdPath = '/test/game.chd';
            const mockGame = {
                name: 'Test Game',
                files: [
                    {
                        name: 'extracted.bin',
                        size: 1024,
                        sha1hex: 'a1b2c3d4e5f6',
                    },
                ],
                roms: [
                    {
                        name: 'extracted.cue',
                        size: 123,
                        sha1hex: 'a1b2c3d4e5f6',
                    },
                ],
            };
            const mockDat = {
                games: [mockGame],
                romsBySha1hex: new Map([
                    ['a1b2c3d4e5f6', [
                        {
                            name: 'extracted.bin',
                            size: 1024,
                            sha1hex: 'a1b2c3d4e5f6',
                            game: mockGame,
                        }
                    ]]
                ]),
            } as any;
            const showCommandOutput = false;
            const allowCueMismatches = false;

            /* Mock the verification process */
            mockChd.extract.mockResolvedValue('/temp/extracted.cue');
            mockStorage.mockReturnValue({
                createTemporaryDirectory: jest.fn().mockResolvedValue('/temp/dir'),
                list: jest.fn().mockResolvedValue(['/temp/extracted.cue', '/temp/extracted.bin']),
                read: jest.fn().mockResolvedValue(new TextEncoder().encode('FILE "game.bin" BINARY\nTRACK 01 MODE1/2352\nINDEX 01 00:00:00')),
                remove: jest.fn().mockResolvedValue(undefined),
                copy: jest.fn().mockResolvedValue(undefined),
                exists: jest.fn().mockResolvedValue(true),
                readFile: jest.fn().mockResolvedValue(''),
                writeFile: jest.fn().mockResolvedValue(undefined),
                deleteFile: jest.fn().mockResolvedValue(undefined),
                deleteDirectory: jest.fn().mockResolvedValue(undefined),
                createDirectory: jest.fn().mockResolvedValue(undefined),
                move: jest.fn().mockResolvedValue(undefined),
                write: jest.fn().mockResolvedValue(undefined),
                size: jest.fn().mockResolvedValue(1024),
                getFileSize: jest.fn().mockResolvedValue(0),
                getFileStats: jest.fn().mockResolvedValue({
                    size: 0,
                    mtime: new Date(),
                    isFile: () => true,
                    isDirectory: () => false,
                }),
            } as any);

            /* Act */
            const result = await verifyChd(chdPath, mockDat, showCommandOutput, allowCueMismatches);

            /* Assert */
            expect(result).toBeDefined();
            expect(mockChd.extract).toHaveBeenCalledWith({
                chdFilePath: chdPath,
                format: 'cue',
            });
        });

        it('should handle verification errors', async () => {
            /* Arrange */
            const chdPath = '/test/game.chd';
            const mockDat = {
                games: [],
            } as any;
            const error = new Error('Verification failed');
            
            mockChd.extract.mockRejectedValue(error);
            mockStorage.mockReturnValue({
                createTemporaryDirectory: jest.fn().mockResolvedValue('/temp/dir'),
                list: jest.fn().mockResolvedValue([]),
                copy: jest.fn().mockResolvedValue(undefined),
                exists: jest.fn().mockResolvedValue(true),
                readFile: jest.fn().mockResolvedValue(''),
                writeFile: jest.fn().mockResolvedValue(undefined),
                deleteFile: jest.fn().mockResolvedValue(undefined),
                deleteDirectory: jest.fn().mockResolvedValue(undefined),
                createDirectory: jest.fn().mockResolvedValue(undefined),
                move: jest.fn().mockResolvedValue(undefined),
                remove: jest.fn().mockResolvedValue(undefined),
                getFileSize: jest.fn().mockResolvedValue(0),
                getFileStats: jest.fn().mockResolvedValue({
                    size: 0,
                    mtime: new Date(),
                    isFile: () => true,
                    isDirectory: () => false,
                }),
            } as any);

            /* Act & Assert */
            await expect(verifyChd(chdPath, mockDat, false, false)).rejects.toThrow('Failed to convert .chd using existing CHD implementation');
        });
    });
}); 