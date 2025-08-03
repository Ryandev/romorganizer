import verifyBuilder from './verify.builder';

/* Mock dependencies */
jest.mock('./verify.cli', () => ({
    parseVerifyArguments: jest.fn(),
}));

jest.mock('./verify', () => ({
    VerifyRunnerDirectory: jest.fn(),
}));

jest.mock('./verify.help', () => ({
    VERIFY_HELP_TEXT: 'Mock verify help text',
}));

jest.mock('../utils/dat-loader', () => ({
    loadDatFromPath: jest.fn(),
}));

jest.mock('../utils/cuesheet-loader', () => ({
    loadCuesheetsFromZip: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
    log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('verify.builder', () => {
    const mockParseVerifyArguments = require('./verify.cli').parseVerifyArguments;
    const MockVerifyRunnerDirectory = require('./verify').VerifyRunnerDirectory;
    const mockLoadDatFromPath = require('../utils/dat-loader').loadDatFromPath;
    const mockLoadCuesheetsFromZip = require('../utils/cuesheet-loader').loadCuesheetsFromZip;
    const mockLog = require('../utils/logger').log;

    beforeEach(() => {
        jest.clearAllMocks();
        MockVerifyRunnerDirectory.mockImplementation(() => ({
            start: jest.fn().mockResolvedValue(['verified1.chd', 'verified2.chd']),
        }));
        mockLoadDatFromPath.mockResolvedValue({
            system: 'Test System',
            games: [{ name: 'Test Game', roms: [] }],
            romsBySha1hex: new Map(),
        });
        mockLoadCuesheetsFromZip.mockResolvedValue([
            { name: 'test1.cue', content: 'test content 1' },
            { name: 'test2.cue', content: 'test content 2' },
        ]);
    });

    describe('builder function', () => {
        it('should return a RunnerBuilder instance', () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: '/test/temp',
                rename: false,
                force: false,
            };
            mockParseVerifyArguments.mockReturnValue(mockParsedArgs);

            /* Act */
            const result = verifyBuilder(['--source-dir', '/test/source', '--dat-file', '/test/datfile.dat', '--cuesheets-file', '/test/cuesheets.zip']);

            /* Assert */
            expect(result).toBeDefined();
            expect(typeof result.create).toBe('function');
            expect(typeof result.getHelpText).toBe('function');
            expect(mockParseVerifyArguments).toHaveBeenCalledWith(['--source-dir', '/test/source', '--dat-file', '/test/datfile.dat', '--cuesheets-file', '/test/cuesheets.zip']);
        });

        it('should create a VerifyRunnerDirectory with correct parameters', async () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: '/test/temp',
                rename: true,
                force: true,
            };
            mockParseVerifyArguments.mockReturnValue(mockParsedArgs);

            const mockDat = {
                system: 'Test System',
                games: [{ name: 'Test Game', roms: [] }],
                romsBySha1hex: new Map(),
            };
            const mockCuesheets = [
                { name: 'test1.cue', content: 'test content 1' },
                { name: 'test2.cue', content: 'test content 2' },
            ];
            mockLoadDatFromPath.mockResolvedValue(mockDat);
            mockLoadCuesheetsFromZip.mockResolvedValue(mockCuesheets);

            /* Act */
            const builder = verifyBuilder(['--source-dir', '/test/source', '--dat-file', '/test/datfile.dat', '--cuesheets-file', '/test/cuesheets.zip', '--rename', '--force']);
            const runner = await builder.create();

            /* Assert */
            expect(mockLoadDatFromPath).toHaveBeenCalledWith('/test/datfile.dat');
            expect(mockLoadCuesheetsFromZip).toHaveBeenCalledWith('/test/cuesheets.zip');
            expect(MockVerifyRunnerDirectory).toHaveBeenCalledWith(
                '/test/source',
                mockDat,
                mockCuesheets,
                true,
                true
            );
            expect(runner).toBeDefined();
            expect(typeof runner.start).toBe('function');
        });

        it('should log appropriate messages during creation', async () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: undefined,
                rename: false,
                force: false,
            };
            mockParseVerifyArguments.mockReturnValue(mockParsedArgs);

            const mockDat = {
                system: 'Test System',
                games: [{ name: 'Game 1' }, { name: 'Game 2' }],
                romsBySha1hex: new Map(),
            };
            const mockCuesheets = [
                { name: 'test1.cue', content: 'content 1' },
                { name: 'test2.cue', content: 'content 2' },
            ];
            mockLoadDatFromPath.mockResolvedValue(mockDat);
            mockLoadCuesheetsFromZip.mockResolvedValue(mockCuesheets);

            /* Act */
            const builder = verifyBuilder(['--source-dir', '/test/source', '--dat-file', '/test/datfile.dat', '--cuesheets-file', '/test/cuesheets.zip']);
            await builder.create();

            /* Assert */
            expect(mockLog.info).toHaveBeenCalledWith('Preloading DAT file: /test/datfile.dat');
            expect(mockLog.info).toHaveBeenCalledWith('Loaded DAT file with 2 games');
            expect(mockLog.info).toHaveBeenCalledWith('Loading cuesheets from: /test/cuesheets.zip');
            expect(mockLog.info).toHaveBeenCalledWith('Loaded 2 cuesheet entries');
        });

        it('should return the correct help text', () => {
            /* Arrange */
            mockParseVerifyArguments.mockReturnValue({});

            /* Act */
            const builder = verifyBuilder([]);
            const helpText = builder.getHelpText();

            /* Assert */
            expect(helpText).toBe('Mock verify help text');
        });

        it('should handle empty parameters array', () => {
            /* Arrange */
            mockParseVerifyArguments.mockReturnValue({
                sourceDir: '/default/source',
                datFile: '/default/datfile.dat',
                cuesheetsFile: '/default/cuesheets.zip',
                tempDir: undefined,
                rename: false,
                force: false,
            });

            /* Act */
            const result = verifyBuilder([]);

            /* Assert */
            expect(result).toBeDefined();
            expect(mockParseVerifyArguments).toHaveBeenCalledWith([]);
        });

        it('should handle parameters with all optional flags', () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: '/custom/temp',
                rename: true,
                force: true,
            };
            mockParseVerifyArguments.mockReturnValue(mockParsedArgs);

            /* Act */
            const builder = verifyBuilder([
                '--source-dir', '/test/source',
                '--dat-file', '/test/datfile.dat',
                '--cuesheets-file', '/test/cuesheets.zip',
                '--temp-dir', '/custom/temp',
                '--rename',
                '--force'
            ]);

            /* Assert */
            expect(builder).toBeDefined();
            expect(mockParseVerifyArguments).toHaveBeenCalledWith([
                '--source-dir', '/test/source',
                '--dat-file', '/test/datfile.dat',
                '--cuesheets-file', '/test/cuesheets.zip',
                '--temp-dir', '/custom/temp',
                '--rename',
                '--force'
            ]);
        });

        it('should propagate parsing errors', () => {
            /* Arrange */
            const parseError = new Error('Invalid arguments');
            mockParseVerifyArguments.mockImplementation(() => {
                throw parseError;
            });

            /* Act & Assert */
            expect(() => {
                verifyBuilder(['--invalid-flag']);
            }).toThrow('Invalid arguments');
        });

        it('should handle DAT loading errors', async () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: undefined,
                rename: false,
                force: false,
            };
            mockParseVerifyArguments.mockReturnValue(mockParsedArgs);
            mockLoadDatFromPath.mockRejectedValue(new Error('DAT file not found'));

            /* Act & Assert */
            const builder = verifyBuilder(['--source-dir', '/test/source', '--dat-file', '/test/datfile.dat', '--cuesheets-file', '/test/cuesheets.zip']);
            await expect(builder.create()).rejects.toThrow('DAT file not found');
        });

        it('should handle cuesheets loading errors', async () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: undefined,
                rename: false,
                force: false,
            };
            mockParseVerifyArguments.mockReturnValue(mockParsedArgs);
            mockLoadDatFromPath.mockResolvedValue({
                system: 'Test System',
                games: [],
                romsBySha1hex: new Map(),
            });
            mockLoadCuesheetsFromZip.mockRejectedValue(new Error('Cuesheets file not found'));

            /* Act & Assert */
            const builder = verifyBuilder(['--source-dir', '/test/source', '--dat-file', '/test/datfile.dat', '--cuesheets-file', '/test/cuesheets.zip']);
            await expect(builder.create()).rejects.toThrow('Cuesheets file not found');
        });
    });

    describe('RunnerBuilder interface compliance', () => {
        it('should implement RunnerBuilder interface correctly', () => {
            /* Arrange */
            mockParseVerifyArguments.mockReturnValue({
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: undefined,
                rename: false,
                force: false,
            });

            /* Act */
            const builder = verifyBuilder(['--source-dir', '/test/source', '--dat-file', '/test/datfile.dat', '--cuesheets-file', '/test/cuesheets.zip']);

            /* Assert */
            expect(builder).toHaveProperty('create');
            expect(builder).toHaveProperty('getHelpText');
            expect(typeof builder.create).toBe('function');
            expect(typeof builder.getHelpText).toBe('function');
        });

        it('should return a Promise from create method', () => {
            /* Arrange */
            mockParseVerifyArguments.mockReturnValue({
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: undefined,
                rename: false,
                force: false,
            });

            /* Act */
            const builder = verifyBuilder(['--source-dir', '/test/source', '--dat-file', '/test/datfile.dat', '--cuesheets-file', '/test/cuesheets.zip']);
            const createResult = builder.create();

            /* Assert */
            expect(createResult).toBeInstanceOf(Promise);
        });
    });
}); 