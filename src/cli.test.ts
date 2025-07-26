import { describe, it, expect, beforeEach } from '@jest/globals';
import { loadArguments } from './cli.js';
import { guardDirectoryExists } from './guard.js';

// Mock the guard module
jest.mock('./guard.js', () => ({
    guardDirectoryExists: jest.fn(),
}));

describe('loadArguments', () => {
    const mockGuardDirectoryExists = guardDirectoryExists as jest.MockedFunction<typeof guardDirectoryExists>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('valid arguments', () => {
        it('should parse source and output directories with short flags', () => {
            const args = ['-s', '/source/path', '-o', '/output/path'];
            
            const result = loadArguments(args);
            
            expect(result).toEqual({
                SOURCE_DIR: '/source/path',
                OUTPUT_DIR: '/output/path',
                REMOVE_SOURCE: false,
            });
            expect(mockGuardDirectoryExists).toHaveBeenCalledWith('/source/path', 'Source directory does not exist: /source/path');
            expect(mockGuardDirectoryExists).toHaveBeenCalledWith('/output/path', 'Output directory does not exist: /output/path');
        });

        it('should parse source and output directories with kebab-case flags', () => {
            const args = ['--source-dir', '/source/path', '--output-dir', '/output/path'];
            
            const result = loadArguments(args);
            
            expect(result).toEqual({
                SOURCE_DIR: '/source/path',
                OUTPUT_DIR: '/output/path',
                REMOVE_SOURCE: false,
            });
        });

        it('should parse remove-source flag as true with various truthy values', () => {
            const truthyValues = ['true', '1', 'yes', 'y', 't'];
            
            for (const value of truthyValues) {
                const args = ['-s', '/source/path', '-o', '/output/path', '-r', value];
                
                const result = loadArguments(args);
                
                expect(result.REMOVE_SOURCE).toBe(true);
            }
        });

        it('should parse remove-source flag as false with falsy values', () => {
            const falsyValues = ['false', '0', 'no', 'n', 'f', 'anything-else'];
            
            for (const value of falsyValues) {
                const args = ['-s', '/source/path', '-o', '/output/path', '-r', value];
                
                const result = loadArguments(args);
                
                expect(result.REMOVE_SOURCE).toBe(false);
            }
        });

        it('should parse remove-source flag with kebab-case', () => {
            const args = ['-s', '/source/path', '-o', '/output/path', '--remove-source', 'true'];
            
            const result = loadArguments(args);
            
            expect(result.REMOVE_SOURCE).toBe(true);
        });

        it('should ignore unknown flags', () => {
            const args = ['-s', '/source/path', '-o', '/output/path', '--unknown', 'value', '--another-unknown'];
            
            const result = loadArguments(args);
            
            expect(result).toEqual({
                SOURCE_DIR: '/source/path',
                OUTPUT_DIR: '/output/path',
                REMOVE_SOURCE: false,
            });
        });

        it('should handle mixed flag styles', () => {
            const args = ['-s', '/source/path', '--output-dir', '/output/path', '--remove-source', 'yes'];
            
            const result = loadArguments(args);
            
            expect(result).toEqual({
                SOURCE_DIR: '/source/path',
                OUTPUT_DIR: '/output/path',
                REMOVE_SOURCE: true,
            });
        });
    });

    describe('validation errors', () => {
        it('should throw error when SOURCE_DIR is missing', () => {
            const args = ['-o', '/output/path'];
            
            expect(() => loadArguments(args)).toThrow('Missing arg: SOURCE_DIR');
        });

        it('should throw error when OUTPUT_DIR is missing', () => {
            const args = ['-s', '/source/path'];
            
            expect(() => loadArguments(args)).toThrow('Missing arg: OUTPUT_DIR');
        });

        it('should throw error when both SOURCE_DIR and OUTPUT_DIR are missing', () => {
            const args = ['--remove-source', 'true'];
            
            expect(() => loadArguments(args)).toThrow('Missing arg: SOURCE_DIR');
        });

        it('should throw error when source directory does not exist', () => {
            mockGuardDirectoryExists.mockImplementation((path, message) => {
                if (path === '/nonexistent/source') {
                    throw new Error(message);
                }
            });

            const args = ['-s', '/nonexistent/source', '-o', '/output/path'];
            
            expect(() => loadArguments(args)).toThrow('Source directory does not exist: /nonexistent/source');
        });

        it('should throw error when output directory does not exist', () => {
            mockGuardDirectoryExists.mockImplementation((path, message) => {
                if (path === '/nonexistent/output') {
                    throw new Error(message);
                }
            });

            const args = ['-s', '/source/path', '-o', '/nonexistent/output'];
            
            expect(() => loadArguments(args)).toThrow('Output directory does not exist: /nonexistent/output');
        });
    });

    describe('edge cases', () => {
        it('should handle empty arguments array', () => {
            expect(() => loadArguments([])).toThrow('Missing arg: SOURCE_DIR');
        });

        it('should handle arguments with only flags but no values', () => {
            const args = ['-s', '-o', '-r'];
            
            expect(() => loadArguments(args)).toThrow('Missing arg: SOURCE_DIR');
        });

        it('should handle arguments with trailing flags', () => {
            const args = ['-s', '/source/path', '-o', '/output/path', '-r'];
            
            const result = loadArguments(args);
            
            expect(result).toEqual({
                SOURCE_DIR: '/source/path',
                OUTPUT_DIR: '/output/path',
                REMOVE_SOURCE: false,
            });
        });

        it('should handle arguments with spaces in paths', () => {
            const args = ['-s', '/source path/with spaces', '-o', '/output path/with spaces'];
            
            const result = loadArguments(args);
            
            expect(result).toEqual({
                SOURCE_DIR: '/source path/with spaces',
                OUTPUT_DIR: '/output path/with spaces',
                REMOVE_SOURCE: false,
            });
        });

        it('should not support camelCase naming conventions', () => {
            const args = ['--sourceDir', '/source/path', '--outputDir', '/output/path'];
            
            expect(() => loadArguments(args)).toThrow('Missing arg: SOURCE_DIR');
        });

        it('should not support snake_case naming conventions', () => {
            const args = ['--source_dir', '/source/path', '--output_dir', '/output/path'];
            
            expect(() => loadArguments(args)).toThrow('Missing arg: SOURCE_DIR');
        });

        it('should not support short names without aliases', () => {
            const args = ['--source', '/source/path', '--output', '/output/path'];
            
            expect(() => loadArguments(args)).toThrow('Missing arg: SOURCE_DIR');
        });
    });
}); 