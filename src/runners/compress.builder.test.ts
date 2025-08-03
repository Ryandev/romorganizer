import compressBuilder from './compress.builder';

/* Mock dependencies */
jest.mock('./compress.cli', () => ({
    parseCompressArguments: jest.fn(),
}));

jest.mock('./compress', () => ({
    RunnerDirectory: jest.fn(),
}));

jest.mock('./compress.help', () => ({
    COMPRESS_HELP_TEXT: 'Mock compress help text',
}));

describe('compress.builder', () => {
    const mockParseCompressArguments = require('./compress.cli').parseCompressArguments;
    const MockRunnerDirectory = require('./compress').RunnerDirectory;

    beforeEach(() => {
        jest.clearAllMocks();
        MockRunnerDirectory.mockImplementation(() => ({
            start: jest.fn().mockResolvedValue(['output1.chd', 'output2.chd']),
        }));
    });

    describe('builder function', () => {
        it('should return a RunnerBuilder instance', () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                outputDir: '/test/output',
                tempDir: '/test/temp',
                overwrite: false,
                removeSource: false,
            };
            mockParseCompressArguments.mockReturnValue(mockParsedArgs);

            /* Act */
            const result = compressBuilder(['--source-dir', '/test/source', '--output-dir', '/test/output']);

            /* Assert */
            expect(result).toBeDefined();
            expect(typeof result.create).toBe('function');
            expect(typeof result.getHelpText).toBe('function');
            expect(mockParseCompressArguments).toHaveBeenCalledWith(['--source-dir', '/test/source', '--output-dir', '/test/output']);
        });

        it('should create a RunnerDirectory with correct parameters', async () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                outputDir: '/test/output',
                tempDir: '/test/temp',
                overwrite: true,
                removeSource: true,
            };
            mockParseCompressArguments.mockReturnValue(mockParsedArgs);

            /* Act */
            const builder = compressBuilder(['--source-dir', '/test/source', '--output-dir', '/test/output', '--overwrite', '--remove-source']);
            const runner = await builder.create();

            /* Assert */
            expect(MockRunnerDirectory).toHaveBeenCalledWith(
                '/test/source',
                '/test/output',
                '/test/temp',
                true,
                true
            );
            expect(runner).toBeDefined();
            expect(typeof runner.start).toBe('function');
        });

        it('should return the correct help text', () => {
            /* Arrange */
            mockParseCompressArguments.mockReturnValue({});

            /* Act */
            const builder = compressBuilder([]);
            const helpText = builder.getHelpText();

            /* Assert */
            expect(helpText).toBe('Mock compress help text');
        });

        it('should handle empty parameters array', () => {
            /* Arrange */
            mockParseCompressArguments.mockReturnValue({
                sourceDir: '/default/source',
                outputDir: '/default/output',
                tempDir: undefined,
                overwrite: false,
                removeSource: false,
            });

            /* Act */
            const result = compressBuilder([]);

            /* Assert */
            expect(result).toBeDefined();
            expect(mockParseCompressArguments).toHaveBeenCalledWith([]);
        });

        it('should handle parameters with all optional flags', () => {
            /* Arrange */
            const mockParsedArgs = {
                sourceDir: '/test/source',
                outputDir: '/test/output',
                tempDir: '/custom/temp',
                overwrite: true,
                removeSource: true,
            };
            mockParseCompressArguments.mockReturnValue(mockParsedArgs);

            /* Act */
            const builder = compressBuilder([
                '--source-dir', '/test/source',
                '--output-dir', '/test/output',
                '--temp-dir', '/custom/temp',
                '--overwrite',
                '--remove-source'
            ]);

            /* Assert */
            expect(builder).toBeDefined();
            expect(mockParseCompressArguments).toHaveBeenCalledWith([
                '--source-dir', '/test/source',
                '--output-dir', '/test/output',
                '--temp-dir', '/custom/temp',
                '--overwrite',
                '--remove-source'
            ]);
        });

        it('should propagate parsing errors', () => {
            /* Arrange */
            const parseError = new Error('Invalid arguments');
            mockParseCompressArguments.mockImplementation(() => {
                throw parseError;
            });

            /* Act & Assert */
            expect(() => {
                compressBuilder(['--invalid-flag']);
            }).toThrow('Invalid arguments');
        });
    });

    describe('RunnerBuilder interface compliance', () => {
        it('should implement RunnerBuilder interface correctly', () => {
            /* Arrange */
            mockParseCompressArguments.mockReturnValue({
                sourceDir: '/test/source',
                outputDir: '/test/output',
                tempDir: undefined,
                overwrite: false,
                removeSource: false,
            });

            /* Act */
            const builder = compressBuilder(['--source-dir', '/test/source', '--output-dir', '/test/output']);

            /* Assert */
            expect(builder).toHaveProperty('create');
            expect(builder).toHaveProperty('getHelpText');
            expect(typeof builder.create).toBe('function');
            expect(typeof builder.getHelpText).toBe('function');
        });

        it('should return a Promise from create method', () => {
            /* Arrange */
            mockParseCompressArguments.mockReturnValue({
                sourceDir: '/test/source',
                outputDir: '/test/output',
                tempDir: undefined,
                overwrite: false,
                removeSource: false,
            });

            /* Act */
            const builder = compressBuilder(['--source-dir', '/test/source', '--output-dir', '/test/output']);
            const createResult = builder.create();

            /* Assert */
            expect(createResult).toBeInstanceOf(Promise);
        });
    });
}); 