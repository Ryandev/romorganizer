import { parseVerifyArguments } from './verify.cli';

/* Mock dependencies */
jest.mock('command-line-args', () => jest.fn());
jest.mock('../utils/guard', () => ({
    guardDirectoryExists: jest.fn(),
}));

describe('verify.cli', () => {
    const mockCommandLineArgs = require('command-line-args') as jest.MockedFunction<any>;
    const mockGuardDirectoryExists = require('../utils/guard').guardDirectoryExists as jest.MockedFunction<any>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGuardDirectoryExists.mockImplementation(() => {
            /* Default implementation - directory exists */
        });
    });

    describe('parseVerifyArguments', () => {
        it('should parse valid arguments correctly', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
                'temp-dir': '/test/temp',
                'rename': true,
                'force': false,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseVerifyArguments([
                '--source-dir', '/test/source',
                '--dat-file', '/test/datfile.dat',
                '--cuesheets-file', '/test/cuesheets.zip',
                '--temp-dir', '/test/temp',
                '--rename'
            ]);

            /* Assert */
            expect(result).toEqual({
                command: 'verify',
                sourceDir: '/test/source',
                outputDir: undefined,
                tempDir: '/test/temp',
                datFile: '/test/datfile.dat',
                cuesheetsFile: '/test/cuesheets.zip',
                removeSource: false,
                useDatFileName: false,
                rename: true,
                overwrite: false,
                force: false,
            });
            expect(mockCommandLineArgs).toHaveBeenCalledWith(expect.any(Array), {
                argv: [
                    '--source-dir', '/test/source',
                    '--dat-file', '/test/datfile.dat',
                    '--cuesheets-file', '/test/cuesheets.zip',
                    '--temp-dir', '/test/temp',
                    '--rename'
                ],
                partial: true,
            });
        });

        it('should parse short arguments correctly', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
                'rename': false,
                'force': true,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseVerifyArguments([
                '-s', '/test/source',
                '-d', '/test/datfile.dat',
                '-c', '/test/cuesheets.zip',
                '-f'
            ]);

            /* Assert */
            expect(result).toEqual({
                command: 'verify',
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
            const result = parseVerifyArguments([
                '--source-dir', '/test/source',
                '--dat-file', '/test/datfile.dat',
                '--cuesheets-file', '/test/cuesheets.zip'
            ]);

            /* Assert */
            expect(result).toEqual({
                command: 'verify',
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

        it('should throw error for help flag', () => {
            /* Act & Assert */
            expect(() => {
                parseVerifyArguments(['--help']);
            }).toThrow('Help requested');

            expect(() => {
                parseVerifyArguments(['-h']);
            }).toThrow('Help requested');
        });

        it('should throw error for missing source directory', () => {
            /* Arrange */
            const mockParsedOptions = {
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseVerifyArguments(['--dat-file', '/test/datfile.dat', '--cuesheets-file', '/test/cuesheets.zip']);
            }).toThrow(/sourceDir: Invalid input: expected string, received undefined/);
        });

        it('should throw error for missing dat file', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'cuesheets-file': '/test/cuesheets.zip',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseVerifyArguments(['--source-dir', '/test/source', '--cuesheets-file', '/test/cuesheets.zip']);
            }).toThrow(/datFile: Invalid input: expected string, received undefined/);
        });

        it('should throw error for missing cuesheets file', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'dat-file': '/test/datfile.dat',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseVerifyArguments(['--source-dir', '/test/source', '--dat-file', '/test/datfile.dat']);
            }).toThrow(/cuesheetsFile: Invalid input: expected string, received undefined/);
        });

        it('should throw error for non-existent source directory', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/nonexistent/source',
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);
            mockGuardDirectoryExists.mockImplementation(() => {
                throw new Error('Directory does not exist');
            });

            /* Act & Assert */
            expect(() => {
                parseVerifyArguments(['--source-dir', '/nonexistent/source', '--dat-file', '/test/datfile.dat', '--cuesheets-file', '/test/cuesheets.zip']);
            }).toThrow('sourceDir: Source directory does not exist or is not accessible');
        });

        it('should handle empty arguments array', () => {
            /* Arrange */
            const mockParsedOptions = {};
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseVerifyArguments([]);
            }).toThrow(/sourceDir: Invalid input: expected string, received undefined/);
        });

        it('should handle boolean flags correctly', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
                'rename': true,
                'force': true,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseVerifyArguments([
                '--source-dir', '/test/source',
                '--dat-file', '/test/datfile.dat',
                '--cuesheets-file', '/test/cuesheets.zip',
                '--rename',
                '--force'
            ]);

            /* Assert */
            expect(result.rename).toBe(true);
            expect(result.force).toBe(true);
        });

        it('should handle short boolean flags correctly', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
                'rename': true,
                'force': true,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseVerifyArguments([
                '-s', '/test/source',
                '-d', '/test/datfile.dat',
                '-c', '/test/cuesheets.zip',
                '-n',
                '-f'
            ]);

            /* Assert */
            expect(result.rename).toBe(true);
            expect(result.force).toBe(true);
        });

        it('should set default values for optional fields', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'dat-file': '/test/datfile.dat',
                'cuesheets-file': '/test/cuesheets.zip',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseVerifyArguments([
                '--source-dir', '/test/source',
                '--dat-file', '/test/datfile.dat',
                '--cuesheets-file', '/test/cuesheets.zip'
            ]);

            /* Assert */
            expect(result.removeSource).toBe(false);
            expect(result.useDatFileName).toBe(false);
            expect(result.rename).toBe(false);
            expect(result.overwrite).toBe(false);
            expect(result.force).toBe(false);
        });

        it('should handle command-line-args errors', () => {
            /* Arrange */
            mockCommandLineArgs.mockImplementation(() => {
                throw new Error('Invalid option');
            });

            /* Act & Assert */
            expect(() => {
                parseVerifyArguments(['--invalid-option']);
            }).toThrow('Invalid option');
        });

        it('should handle Zod validation errors with multiple issues', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '',
                'dat-file': '',
                'cuesheets-file': '',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseVerifyArguments(['--source-dir', '', '--dat-file', '', '--cuesheets-file', '']);
            }).toThrow(/sourceDir: Source directory is required/);
        });
    });
}); 