import { parseCompressArguments } from './compress.cli';

/* Mock dependencies */
jest.mock('command-line-args', () => jest.fn());
jest.mock('../utils/guard', () => ({
    guardDirectoryExists: jest.fn(),
}));

describe('compress.cli', () => {
    const mockCommandLineArgs = require('command-line-args') as jest.MockedFunction<any>;
    const mockGuardDirectoryExists = require('../utils/guard').guardDirectoryExists as jest.MockedFunction<any>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGuardDirectoryExists.mockImplementation(() => {
            /* Default implementation - directory exists */
        });
    });

    describe('parseCompressArguments', () => {
        it('should parse valid arguments correctly', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'output-dir': '/test/output',
                'temp-dir': '/test/temp',
                'remove-source': true,
                'use-dat-file-name': false,
                'rename': true,
                'overwrite': false,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseCompressArguments([
                '--source-dir', '/test/source',
                '--output-dir', '/test/output',
                '--temp-dir', '/test/temp',
                '--remove-source',
                '--rename'
            ]);

            /* Assert */
            expect(result).toEqual({
                command: 'compress',
                sourceDir: '/test/source',
                outputDir: '/test/output',
                tempDir: '/test/temp',
                removeSource: true,
                overwrite: false,
            });
            expect(mockCommandLineArgs).toHaveBeenCalledWith(expect.any(Array), {
                argv: [
                    '--source-dir', '/test/source',
                    '--output-dir', '/test/output',
                    '--temp-dir', '/test/temp',
                    '--remove-source',
                    '--rename'
                ],
                partial: true,
            });
        });

        it('should parse short arguments correctly', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'output-dir': '/test/output',
                'temp-dir': '/test/temp',
                'remove-source': false,
                'use-dat-file-name': true,
                'rename': false,
                'overwrite': true,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseCompressArguments([
                '-s', '/test/source',
                '-o', '/test/output',
                '-t', '/test/temp',
                '-u',
                '-w'
            ]);

            /* Assert */
            expect(result).toEqual({
                command: 'compress',
                sourceDir: '/test/source',
                outputDir: '/test/output',
                tempDir: '/test/temp',
                removeSource: false,
                overwrite: true,
            });
        });

        it('should handle missing optional arguments', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'output-dir': '/test/output',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseCompressArguments([
                '--source-dir', '/test/source',
                '--output-dir', '/test/output'
            ]);

            /* Assert */
            expect(result).toEqual({
                command: 'compress',
                sourceDir: '/test/source',
                outputDir: '/test/output',
                tempDir: undefined,
                removeSource: false,
                overwrite: false,
            });
        });

        it('should throw error for help flag', () => {
            /* Act & Assert */
            expect(() => {
                parseCompressArguments(['--help']);
            }).toThrow('Help requested');

            expect(() => {
                parseCompressArguments(['-h']);
            }).toThrow('Help requested');
        });

        it('should throw error for missing source directory', () => {
            /* Arrange */
            const mockParsedOptions = {
                'output-dir': '/test/output',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseCompressArguments(['--output-dir', '/test/output']);
            }).toThrow(/sourceDir: Invalid input: expected string, received undefined/);
        });

        it('should throw error for missing output directory', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseCompressArguments(['--source-dir', '/test/source']);
            }).toThrow(/outputDir: Invalid input: expected string, received undefined/);
        });

        it('should throw error for non-existent source directory', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/nonexistent/source',
                'output-dir': '/test/output',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);
            mockGuardDirectoryExists.mockImplementation(() => {
                throw new Error('Directory does not exist');
            });

            /* Act & Assert */
            expect(() => {
                parseCompressArguments(['--source-dir', '/nonexistent/source', '--output-dir', '/test/output']);
            }).toThrow('sourceDir: Source directory does not exist or is not accessible');
        });

        it('should throw error for non-existent output directory', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'output-dir': '/nonexistent/output',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);
            mockGuardDirectoryExists
                .mockImplementationOnce(() => {
                    /* Source directory exists */
                })
                .mockImplementationOnce(() => {
                    throw new Error('Directory does not exist');
                });

            /* Act & Assert */
            expect(() => {
                parseCompressArguments(['--source-dir', '/test/source', '--output-dir', '/nonexistent/output']);
            }).toThrow('outputDir: Output directory does not exist or is not accessible');
        });

        it('should handle empty arguments array', () => {
            /* Arrange */
            const mockParsedOptions = {};
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseCompressArguments([]);
            }).toThrow(/sourceDir: Invalid input: expected string, received undefined/);
        });

        it('should handle boolean flags correctly', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'output-dir': '/test/output',
                'remove-source': true,
                'overwrite': true,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseCompressArguments([
                '--source-dir', '/test/source',
                '--output-dir', '/test/output',
                '--remove-source',
                '--overwrite'
            ]);

            /* Assert */
            expect(result.removeSource).toBe(true);
            expect(result.overwrite).toBe(true);
        });

        it('should handle short boolean flags correctly', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'output-dir': '/test/output',
                'remove-source': true,
                'overwrite': true,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseCompressArguments([
                '-s', '/test/source',
                '-o', '/test/output',
                '-r',
                '-w'
            ]);

            /* Assert */
            expect(result.removeSource).toBe(true);
            expect(result.overwrite).toBe(true);
        });

        it('should set default values for optional fields', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '/test/source',
                'output-dir': '/test/output',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseCompressArguments([
                '--source-dir', '/test/source',
                '--output-dir', '/test/output'
            ]);

            /* Assert */
            expect(result.removeSource).toBe(false);
            expect(result.overwrite).toBe(false);
        });

        it('should handle command-line-args errors', () => {
            /* Arrange */
            mockCommandLineArgs.mockImplementation(() => {
                throw new Error('Invalid option');
            });

            /* Act & Assert */
            expect(() => {
                parseCompressArguments(['--invalid-option']);
            }).toThrow('Invalid option');
        });

        it('should handle Zod validation errors with multiple issues', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '',
                'output-dir': '',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseCompressArguments(['--source-dir', '', '--output-dir', '']);
            }).toThrow(/sourceDir: Source directory is required/);
        });

        it('should handle empty string values', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '',
                'output-dir': '',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseCompressArguments(['--source-dir', '', '--output-dir', '']);
            }).toThrow(/sourceDir: Source directory is required/);
        });

        it('should handle undefined values', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': undefined,
                'output-dir': undefined,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseCompressArguments(['--source-dir', undefined as any, '--output-dir', undefined as any]);
            }).toThrow(/sourceDir: Invalid input: expected string, received undefined/);
        });

        it('should handle null values', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': null,
                'output-dir': null,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act & Assert */
            expect(() => {
                parseCompressArguments(['--source-dir', null as any, '--output-dir', null as any]);
            }).toThrow(/sourceDir: Invalid input: expected string, received null/);
        });

        it('should handle whitespace-only values', () => {
            /* Arrange */
            const mockParsedOptions = {
                'source-dir': '   ',
                'output-dir': '   ',
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);
            mockGuardDirectoryExists.mockImplementation(() => {
                throw new Error('Directory does not exist');
            });

            /* Act & Assert */
            expect(() => {
                parseCompressArguments(['--source-dir', '   ', '--output-dir', '   ']);
            }).toThrow(/sourceDir: Source directory does not exist or is not accessible/);
        });

        it('should handle very long directory paths', () => {
            /* Arrange */
            const longPath = '/'.repeat(1000);
            const mockParsedOptions = {
                'source-dir': longPath,
                'output-dir': longPath,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseCompressArguments([
                '--source-dir', longPath,
                '--output-dir', longPath
            ]);

            /* Assert */
            expect(result.sourceDir).toBe(longPath);
            expect(result.outputDir).toBe(longPath);
        });

        it('should handle special characters in paths', () => {
            /* Arrange */
            const specialPath = '/test/path with spaces and @#$%^&*()';
            const mockParsedOptions = {
                'source-dir': specialPath,
                'output-dir': specialPath,
            };
            mockCommandLineArgs.mockReturnValue(mockParsedOptions);

            /* Act */
            const result = parseCompressArguments([
                '--source-dir', specialPath,
                '--output-dir', specialPath
            ]);

            /* Assert */
            expect(result.sourceDir).toBe(specialPath);
            expect(result.outputDir).toBe(specialPath);
        });
    });
}); 