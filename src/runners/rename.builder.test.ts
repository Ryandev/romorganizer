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

jest.mock('../utils/logger', () => ({
    log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('rename.builder', () => {
    const mockParseRenameArguments =
        require('./rename.cli').parseRenameArguments;
    const MockRenameRunnerDirectory = require('./rename').RenameRunnerDirectory;
    const mockLog = require('../utils/logger').log;

    beforeEach(() => {
        jest.clearAllMocks();
        MockRenameRunnerDirectory.mockImplementation(() => ({
            start: jest
                .fn()
                .mockResolvedValue(['renamed1.chd', 'renamed2.chd']),
        }));
    });

    describe('builder function', () => {
        it('should return a RunnerBuilder instance', () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                force: false,
            };
            mockParseRenameArguments.mockReturnValue(mockParsedArgs);

            /* Act */
            const result = renameBuilder(['--source-dir', '/test/source']);

            /* Assert */
            expect(result).toBeDefined();
            expect(typeof result.create).toBe('function');
            expect(typeof result.getHelpText).toBe('function');
            expect(mockParseRenameArguments).toHaveBeenCalledWith([
                '--source-dir',
                '/test/source',
            ]);
        });

        it('should create a RenameRunnerDirectory with correct parameters', async () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                force: true,
            };
            mockParseRenameArguments.mockReturnValue(mockParsedArgs);

            /* Act */
            const builder = renameBuilder([
                '--source-dir',
                '/test/source',
                '--force',
            ]);
            const runner = await builder.create();

            /* Assert */
            expect(MockRenameRunnerDirectory).toHaveBeenCalledWith(
                '/test/source',
                true
            );
            expect(runner).toBeDefined();
            expect(typeof runner.start).toBe('function');
        });

        it('should log appropriate messages during creation', async () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                force: false,
            };
            mockParseRenameArguments.mockReturnValue(mockParsedArgs);

            /* Act */
            const builder = renameBuilder(['--source-dir', '/test/source']);
            await builder.create();

            /* Assert */
            expect(mockLog.info).toHaveBeenCalledWith(
                'Starting rename process for directory: /test/source'
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
                force: false,
            });

            /* Act */
            const builder = renameBuilder([]);

            /* Assert */
            expect(builder).toBeDefined();
            expect(typeof builder.create).toBe('function');
            expect(typeof builder.getHelpText).toBe('function');
        });

        it('should handle parameters with force flag', () => {
            /* Arrange */
            mockParseRenameArguments.mockReturnValue({
                sourceDir: '/test/source',
                force: true,
            });

            /* Act */
            const builder = renameBuilder([
                '--source-dir',
                '/test/source',
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
    });

    describe('RunnerBuilder interface compliance', () => {
        it('should implement RunnerBuilder interface correctly', () => {
            /* Arrange */
            mockParseRenameArguments.mockReturnValue({
                sourceDir: '/test/source',
                force: false,
            });

            /* Act */
            const builder = renameBuilder(['--source-dir', '/test/source']);

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
                force: false,
            });

            /* Act */
            const builder = renameBuilder(['--source-dir', '/test/source']);
            const createResult = builder.create();

            /* Assert */
            expect(createResult).toBeInstanceOf(Promise);
        });
    });
});
