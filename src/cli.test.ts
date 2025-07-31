import { loadArguments } from './cli';

// Mock the guard functions to prevent file existence validation in tests
jest.mock('./utils/guard', () => ({
    guardDirectoryExists: jest.fn(),
    guardFileExists: jest.fn(),
}));

describe('CLI', () => {
    describe('loadArguments', () => {
        it('should parse compress command arguments correctly', () => {
            const args = [
                'compress',
                '--source-dir', './input',
                '--output-dir', './output'
            ];

            const result = loadArguments(args);

            expect(result.command).toBe('compress');
            expect(result.SOURCE_DIR).toBe('./input');
            expect(result.OUTPUT_DIR).toBe('./output');
            expect(result.REMOVE_SOURCE).toBe(false);
        });

        it('should parse verify command arguments correctly', () => {
            const args = [
                'verify',
                '--source-dir', './input',
                '--dat-file', './test.dat',
                '--cuesheets-file', './cuesheets.zip'
            ];

            const result = loadArguments(args);

            expect(result.command).toBe('verify');
            expect(result.SOURCE_DIR).toBe('./input');
            expect(result.DAT_FILE).toBe('./test.dat');
            expect(result.CUESHEETS_FILE).toBe('./cuesheets.zip');
            expect(result.RENAME).toBe(false);
        });

        it('should parse verify command with rename flag correctly', () => {
            const args = [
                'verify',
                '--source-dir', './input',
                '--dat-file', './test.dat',
                '--cuesheets-file', './cuesheets.zip',
                '--rename'
            ];

            const result = loadArguments(args);

            expect(result.command).toBe('verify');
            expect(result.SOURCE_DIR).toBe('./input');
            expect(result.DAT_FILE).toBe('./test.dat');
            expect(result.CUESHEETS_FILE).toBe('./cuesheets.zip');
            expect(result.RENAME).toBe(true);
        });

        it('should parse verify command with short rename flag correctly', () => {
            const args = [
                'verify',
                '--source-dir', './input',
                '--dat-file', './test.dat',
                '--cuesheets-file', './cuesheets.zip',
                '-n'
            ];

            const result = loadArguments(args);

            expect(result.command).toBe('verify');
            expect(result.SOURCE_DIR).toBe('./input');
            expect(result.DAT_FILE).toBe('./test.dat');
            expect(result.CUESHEETS_FILE).toBe('./cuesheets.zip');
            expect(result.RENAME).toBe(true);
        });

        it('should parse short arguments correctly for compress', () => {
            const args = [
                'compress',
                '-s', './input',
                '-o', './output'
            ];

            const result = loadArguments(args);

            expect(result.command).toBe('compress');
            expect(result.SOURCE_DIR).toBe('./input');
            expect(result.OUTPUT_DIR).toBe('./output');
        });

        it('should parse short arguments correctly for verify', () => {
            const args = [
                'verify',
                '-s', './input',
                '-d', './test.dat',
                '-c', './cuesheets.zip'
            ];

            const result = loadArguments(args);

            expect(result.command).toBe('verify');
            expect(result.SOURCE_DIR).toBe('./input');
            expect(result.DAT_FILE).toBe('./test.dat');
            expect(result.CUESHEETS_FILE).toBe('./cuesheets.zip');
        });

        it('should handle boolean flags correctly for compress', () => {
            const args = [
                'compress',
                '--source-dir', './input',
                '--output-dir', './output',
                '--remove-source'
            ];

            const result = loadArguments(args);

            expect(result.command).toBe('compress');
            expect(result.REMOVE_SOURCE).toBe(true);
        });

        it('should handle short boolean flags correctly for compress', () => {
            const args = [
                'compress',
                '-s', './input',
                '-o', './output',
                '-r'
            ];

            const result = loadArguments(args);

            expect(result.command).toBe('compress');
            expect(result.REMOVE_SOURCE).toBe(true);
        });

        it('should throw error for missing command', () => {
            const args = [
                '--source-dir', './input',
                '--output-dir', './output'
            ];

            expect(() => loadArguments(args)).toThrow('Help requested');
        });

        it('should throw error for invalid command', () => {
            const args = [
                'invalid-command',
                '--source-dir', './input'
            ];

            expect(() => loadArguments(args)).toThrow('Help requested');
        });

        it('should throw error for missing source-dir in compress', () => {
            const args = [
                'compress',
                '--output-dir', './output'
            ];

            expect(() => loadArguments(args)).toThrow('Missing required argument: --source-dir (-s)');
        });

        it('should throw error for missing output-dir in compress', () => {
            const args = [
                'compress',
                '--source-dir', './input'
            ];

            expect(() => loadArguments(args)).toThrow('Missing required argument: --output-dir (-o)');
        });

        it('should throw error for missing dat-file in verify', () => {
            const args = [
                'verify',
                '--source-dir', './input',
                '--cuesheets-file', './cuesheets.zip'
            ];

            expect(() => loadArguments(args)).toThrow('Missing required argument: --dat-file (-d)');
        });

        it('should throw error for missing cuesheets-file in verify', () => {
            const args = [
                'verify',
                '--source-dir', './input',
                '--dat-file', './test.dat'
            ];

            expect(() => loadArguments(args)).toThrow('Missing required argument: --cuesheets-file (-c)');
        });
    });
}); 