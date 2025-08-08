import { RENAME_HELP_TEXT } from './rename.help';

describe('rename.help.ts', () => {
    describe('RENAME_HELP_TEXT', () => {
        it('should contain the help text for rename command', () => {
            /* Assert */
            expect(RENAME_HELP_TEXT).toContain('romorganizer rename');
            expect(RENAME_HELP_TEXT).toContain(
                'Usage: romorganizer rename [options]'
            );
            expect(RENAME_HELP_TEXT).toContain('--source-dir');
            expect(RENAME_HELP_TEXT).toContain('--force');
            expect(RENAME_HELP_TEXT).toContain('--help');
        });

        it('should contain examples', () => {
            /* Assert */
            expect(RENAME_HELP_TEXT).toContain('Examples:');
            expect(RENAME_HELP_TEXT).toContain(
                'romorganizer rename -s ./input'
            );
            expect(RENAME_HELP_TEXT).toContain(
                'romorganizer rename --source-dir ./input --force'
            );
        });

        it('should contain note about metadata.json requirement', () => {
            /* Assert */
            expect(RENAME_HELP_TEXT).toContain('Note:');
            expect(RENAME_HELP_TEXT).toContain('metadata.json');
            expect(RENAME_HELP_TEXT).toContain('verify command');
        });
    });
});
