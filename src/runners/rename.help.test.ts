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
            expect(RENAME_HELP_TEXT).toContain('--dat-file');
            expect(RENAME_HELP_TEXT).toContain('--cuesheets-file');
            expect(RENAME_HELP_TEXT).toContain('--temp-dir');
            expect(RENAME_HELP_TEXT).toContain('--force');
            expect(RENAME_HELP_TEXT).toContain('--help');
        });

        it('should contain examples', () => {
            /* Assert */
            expect(RENAME_HELP_TEXT).toContain('Examples:');
            expect(RENAME_HELP_TEXT).toContain(
                'romorganizer rename -s ./input -d ./datfile.dat -c ./cuesheets.zip'
            );
            expect(RENAME_HELP_TEXT).toContain(
                'romorganizer rename --source-dir ./input --dat-file ./datfile.zip --cuesheets-file ./cuesheets.zip'
            );
            expect(RENAME_HELP_TEXT).toContain(
                'romorganizer rename --source-dir ./input --dat-file ./datfile.dat --cuesheets-file ./cuesheets.zip --force'
            );
        });
    });
});
