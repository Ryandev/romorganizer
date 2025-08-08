import renameBuilder from './rename.builder';

/* Mock dependencies */
jest.mock('./rename.cli', () => ({
    parseRenameArguments: jest.fn(),
}));

jest.mock('./rename', () => ({
    RenameRunnerDirectory: jest.fn(),
}));

jest.mock('./rename.help', () => ({
    RENAME_HELP_TEXT: 'Mock rename help text',
}));

jest.mock('../utils/dat-loader', () => ({
    loadDatFromPath: jest.fn(),
}));

jest.mock('../utils/cuesheet-loader', () => ({
    loadCuesheetsPath: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
    log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../utils/storage', () => ({
    __esModule: true,
    default: jest.fn().mockReturnValue({
        exists: jest.fn().mockResolvedValue(true),
        createTemporaryDirectory: jest.fn().mockResolvedValue('/tmp/test'),
        remove: jest.fn().mockResolvedValue(undefined),
        copy: jest.fn().mockResolvedValue(undefined),
        move: jest.fn().mockResolvedValue(undefined),
        write: jest.fn().mockResolvedValue(undefined),
        read: jest.fn().mockResolvedValue(new Uint8Array()),
        list: jest.fn().mockResolvedValue([]),
    }),
}));

describe('rename.builder', () => {
    const mockParseRenameArguments =
        require('./rename.cli').parseRenameArguments;
    const MockRenameRunnerDirectory = require('./rename').RenameRunnerDirectory;
    const mockLoadDatFromPath = require('../utils/dat-loader').loadDatFromPath;
    const mockLoadCuesheetsPath =
        require('../utils/cuesheet-loader').loadCuesheetsPath;
    const mockLog = require('../utils/logger').log;

    beforeEach(() => {
        jest.clearAllMocks();
        MockRenameRunnerDirectory.mockImplementation(() => ({
            start: jest
                .fn()
                .mockResolvedValue(['renamed1.chd', 'renamed2.chd']),
        }));
        mockLoadDatFromPath.mockResolvedValue({
            system: 'Test System',
            games: [{ name: 'Test Game', roms: [] }],
            romsBySha1hex: new Map(),
        });
        mockLoadCuesheetsPath.mockResolvedValue([
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
                force: false,
            };
            mockParseRenameArguments.mockReturnValue(mockParsedArgs);

            /* Act */
            const result = renameBuilder([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
            ]);

            /* Assert */
            expect(result).toBeDefined();
            expect(typeof result.create).toBe('function');
            expect(typeof result.getHelpText).toBe('function');
            expect(mockParseRenameArguments).toHaveBeenCalledWith([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
            ]);
        });

        it('should create a RenameRunnerDirectory with correct parameters', async () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: '/test/temp',
                force: true,
            };
            mockParseRenameArguments.mockReturnValue(mockParsedArgs);

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
            mockLoadCuesheetsPath.mockResolvedValue(mockCuesheets);

            /* Act */
            const builder = renameBuilder([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
                '--force',
            ]);
            const runner = await builder.create();

            /* Assert */
            expect(mockLoadDatFromPath).toHaveBeenCalledWith(
                '/test/datfile.dat'
            );
            expect(mockLoadCuesheetsPath).toHaveBeenCalledWith(
                '/test/cuesheets.zip'
            );
            expect(MockRenameRunnerDirectory).toHaveBeenCalledWith(
                '/test/source',
                mockDat,
                mockCuesheets,
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
                force: false,
            };
            mockParseRenameArguments.mockReturnValue(mockParsedArgs);

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
            mockLoadCuesheetsPath.mockResolvedValue(mockCuesheets);

            /* Act */
            const builder = renameBuilder([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
            ]);
            await builder.create();

            /* Assert */
            expect(mockLog.info).toHaveBeenCalledWith(
                'Preloading DAT file: /test/datfile.dat'
            );
            expect(mockLog.info).toHaveBeenCalledWith(
                'Loaded DAT file with 2 games'
            );
            expect(mockLog.info).toHaveBeenCalledWith(
                'Loading cuesheets from: /test/cuesheets.zip'
            );
            expect(mockLog.info).toHaveBeenCalledWith(
                'Loaded 2 cuesheet entries'
            );
        });

        it('should return the correct help text', () => {
            /* Arrange */
            mockParseRenameArguments.mockReturnValue({});

            /* Act */
            const builder = renameBuilder([]);
            const helpText = builder.getHelpText();

            /* Assert */
            expect(helpText).toBe('Mock rename help text');
        });

        it('should handle empty parameters array', () => {
            /* Arrange */
            mockParseRenameArguments.mockReturnValue({
                sourceDir: '/default/source',
                datFile: '/default/datfile.dat',
                cuesheetsFile: '/default/cuesheets.zip',
                tempDir: undefined,
                force: false,
            });

            /* Act */
            const builder = renameBuilder([]);

            /* Assert */
            expect(builder).toBeDefined();
            expect(typeof builder.create).toBe('function');
            expect(typeof builder.getHelpText).toBe('function');
        });

        it('should handle parameters with all optional flags', () => {
            /* Arrange */
            mockParseRenameArguments.mockReturnValue({
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: '/test/temp',
                force: true,
            });

            /* Act */
            const builder = renameBuilder([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
                '--temp-dir',
                '/test/temp',
                '--force',
            ]);

            /* Assert */
            expect(builder).toBeDefined();
            expect(typeof builder.create).toBe('function');
            expect(typeof builder.getHelpText).toBe('function');
        });

        it('should propagate parsing errors', () => {
            /* Arrange */
            const mockError = new Error('Invalid arguments');
            mockParseRenameArguments.mockImplementation(() => {
                throw mockError;
            });

            /* Act & Assert */
            expect(() => {
                renameBuilder(['--invalid-flag']);
            }).toThrow('Invalid arguments');
        });

        it('should handle DAT loading errors', async () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: undefined,
                force: false,
            };
            mockParseRenameArguments.mockReturnValue(mockParsedArgs);
            mockLoadDatFromPath.mockRejectedValue(
                new Error('DAT file not found')
            );

            /* Act & Assert */
            const builder = renameBuilder([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
            ]);
            await expect(builder.create()).rejects.toThrow(
                'DAT file not found'
            );
        });

        it('should handle cuesheets loading errors', async () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: undefined,
                force: false,
            };
            mockParseRenameArguments.mockReturnValue(mockParsedArgs);
            mockLoadDatFromPath.mockResolvedValue({
                system: 'Test System',
                games: [],
                romsBySha1hex: new Map(),
            });
            mockLoadCuesheetsPath.mockRejectedValue(
                new Error('Cuesheets file not found')
            );

            /* Act & Assert */
            const builder = renameBuilder([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
            ]);
            await expect(builder.create()).rejects.toThrow(
                'Cuesheets file not found'
            );
        });
    });

    describe('RunnerBuilder interface compliance', () => {
        it('should implement RunnerBuilder interface correctly', () => {
            /* Arrange */
            mockParseRenameArguments.mockReturnValue({
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: undefined,
                force: false,
            });

            /* Act */
            const builder = renameBuilder([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
            ]);

            /* Assert */
            expect(builder).toHaveProperty('create');
            expect(builder).toHaveProperty('getHelpText');
            expect(typeof builder.create).toBe('function');
            expect(typeof builder.getHelpText).toBe('function');
        });

        it('should return a Promise from create method', () => {
            /* Arrange */
            mockParseRenameArguments.mockReturnValue({
                sourceDir: '/test/source',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                tempDir: undefined,
                force: false,
            });

            /* Act */
            const builder = renameBuilder([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
            ]);
            const createResult = builder.create();

            /* Assert */
            expect(createResult).toBeInstanceOf(Promise);
        });
    });
});
