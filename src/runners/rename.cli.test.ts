import { parseRenameArguments } from './rename.cli';

/* Mock dependencies */
jest.mock('command-line-args', () => jest.fn());
jest.mock('../utils/guard', () => ({
    guardDirectoryExists: jest.fn(),
}));

describe('rename.cli', () => {
    const mockCommandLineArgs =
        require('command-line-args') as jest.MockedFunction<any>;
    const mockGuardDirectoryExists = require('../utils/guard')
        .guardDirectoryExists as jest.MockedFunction<any>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGuardDirectoryExists.mockImplementation(() => {
            /* Default implementation - directory exists */
        });
    });

    describe('parseRenameArguments', () => {
        it('should parse valid arguments correctly', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
                'temp-dir': '/test/temp',
                force: false,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseRenameArguments([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
                '--temp-dir',
                '/test/temp',
            ]);

            /* Assert */
            expect(result).toEqual({
                command: 'rename',
                sourceDir: '/test/source',
                outputDir: undefined,
                tempDir: '/test/temp',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                removeSource: false,
                useDatFileName: false,
                rename: false,
                overwrite: false,
                force: false,
            });
            expect(mockCommandLineArgs).toHaveBeenCalledWith(
                expect.any(Array),
                {
                    argv: [
                        '--source-dir',
                        '/test/source',
                        '--dat-file',
                        '/test/datfile.dat',
                        '--cuesheets-file',
                        '/test/cuesheets.zip',
                        '--temp-dir',
                        '/test/temp',
                    ],
                    partial: true,
                }
            );
        });

        it('should parse short arguments correctly', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
                force: true,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseRenameArguments([
                '-s',
                '/test/source',
                '-d',
                '/test/datfile.dat',
                '-c',
                '/test/cuesheets.zip',
                '-f',
            ]);

            /* Assert */
            expect(result).toEqual({
                command: 'rename',
                sourceDir: '/test/source',
                outputDir: undefined,
                tempDir: undefined,
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                removeSource: false,
                useDatFileName: false,
                rename: false,
                overwrite: false,
                force: true,
            });
        });

        it('should handle missing optional arguments', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseRenameArguments([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
            ]);

            /* Assert */
            expect(result).toEqual({
                command: 'rename',
                sourceDir: '/test/source',
                outputDir: undefined,
                tempDir: undefined,
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                removeSource: false,
                useDatFileName: false,
                rename: false,
                overwrite: false,
                force: false,
            });
        });

        it('should handle boolean flags correctly', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
                force: true,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseRenameArguments([
                '--source-dir',
                '/test/source',
                '--dat-file',
                '/test/datfile.dat',
                '--cuesheets-file',
                '/test/cuesheets.zip',
                '--force',
            ]);

            /* Assert */
            expect(result.force).toBe(true);
        });

        it('should throw error for missing required arguments', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                /* Missing dat-file and cuesheets-file */
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseRenameArguments(['--source-dir', '/test/source']);
            }).toThrow(/datFile: Invalid input/);
        });

        it('should throw error for invalid source directory', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/invalid/directory',
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);
            mockGuardDirectoryExists.mockImplementation(() => {
                throw new Error('Directory does not exist');
            });

            /* Act & Assert */
            expect(() => {
                parseRenameArguments([
                    '--source-dir',
                    '/invalid/directory',
                    '--dat-file',
                    '/test/datfile.dat',
                    '--cuesheets-file',
                    '/test/cuesheets.zip',
                ]);
            }).toThrow(/Source directory does not exist/);
        });

        it('should handle help flag', () => {
            /* Act & Assert */
            expect(() => {
                parseRenameArguments(['--help']);
            }).toThrow('Help requested');
        });

        it('should handle short help flag', () => {
            /* Act & Assert */
            expect(() => {
                parseRenameArguments(['-h']);
            }).toThrow('Help requested');
        });
    });
});
