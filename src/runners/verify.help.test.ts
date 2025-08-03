import { VERIFY_HELP_TEXT } from './verify.help';

describe('verify.help.ts', () => {
    describe('VERIFY_HELP_TEXT', () => {
        it('should contain the help text for verify command', () => {
            /* Assert */
            expect(VERIFY_HELP_TEXT).toContain('romorganizer verify');
            expect(VERIFY_HELP_TEXT).toContain('Usage: romorganizer verify [options]');
            expect(VERIFY_HELP_TEXT).toContain('--source-dir');
            expect(VERIFY_HELP_TEXT).toContain('--dat-file');
            expect(VERIFY_HELP_TEXT).toContain('--cuesheets-file');
            expect(VERIFY_HELP_TEXT).toContain('--temp-dir');
            expect(VERIFY_HELP_TEXT).toContain('--rename');
            expect(VERIFY_HELP_TEXT).toContain('--force');
            expect(VERIFY_HELP_TEXT).toContain('--help');
        });

        it('should contain examples', () => {
            /* Assert */
            expect(VERIFY_HELP_TEXT).toContain('Examples:');
            expect(VERIFY_HELP_TEXT).toContain('romorganizer verify -s ./input -d ./datfile.dat -c ./cuesheets.zip');
            expect(VERIFY_HELP_TEXT).toContain('romorganizer verify --source-dir ./input --dat-file ./datfile.zip --cuesheets-file ./cuesheets.zip --rename');
            expect(VERIFY_HELP_TEXT).toContain('romorganizer verify --source-dir ./input --dat-file ./datfile.dat --cuesheets-file ./cuesheets.zip --force');
        });
    });
}); 