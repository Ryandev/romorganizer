import { COMPRESS_HELP_TEXT } from './compress.help';

describe('compress.help.ts', () => {
    describe('COMPRESS_HELP_TEXT', () => {
        it('should contain the help text for compress command', () => {
            /* Assert */
            expect(COMPRESS_HELP_TEXT).toContain('romorganizer compress');
            expect(COMPRESS_HELP_TEXT).toContain('Usage: romorganizer compress [options]');
            expect(COMPRESS_HELP_TEXT).toContain('--source-dir');
            expect(COMPRESS_HELP_TEXT).toContain('--output-dir');
            expect(COMPRESS_HELP_TEXT).toContain('--temp-dir');
            expect(COMPRESS_HELP_TEXT).toContain('--remove-source');
            expect(COMPRESS_HELP_TEXT).toContain('--use-dat-file-name');
            expect(COMPRESS_HELP_TEXT).toContain('--rename');
            expect(COMPRESS_HELP_TEXT).toContain('--overwrite');
            expect(COMPRESS_HELP_TEXT).toContain('--help');
        });

        it('should contain examples', () => {
            /* Assert */
            expect(COMPRESS_HELP_TEXT).toContain('Examples:');
            expect(COMPRESS_HELP_TEXT).toContain('romorganizer compress -s ./input -o ./output');
            expect(COMPRESS_HELP_TEXT).toContain('romorganizer compress --source-dir ./input --output-dir ./output --remove-source');
            expect(COMPRESS_HELP_TEXT).toContain('romorganizer compress --source-dir ./input --output-dir ./output --overwrite');
        });
    });
}); 