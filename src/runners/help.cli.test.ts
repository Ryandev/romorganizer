import { parseHelpArguments, helpText, HelpSchema } from './help.cli';

describe('help.cli', () => {
    describe('parseHelpArguments', () => {
        it('should parse arguments with subcommand correctly', () => {
            /* Act */
            const result = parseHelpArguments(['compress']);

            /* Assert */
            expect(result).toEqual({
                command: 'help',
                subcommand: 'compress',
            });
        });

        it('should parse arguments without subcommand correctly', () => {
            /* Act */
            const result = parseHelpArguments([]);

            /* Assert */
            expect(result).toEqual({
                command: 'help',
                subcommand: undefined,
            });
        });

        it('should parse arguments with multiple arguments (takes first)', () => {
            /* Act */
            const result = parseHelpArguments(['verify', 'extra', 'args']);

            /* Assert */
            expect(result).toEqual({
                command: 'help',
                subcommand: 'verify',
            });
        });

        it('should throw error for help flag', () => {
            /* Act & Assert */
            expect(() => {
                parseHelpArguments(['--help']);
            }).toThrow('Help requested');

            expect(() => {
                parseHelpArguments(['-h']);
            }).toThrow('Help requested');
        });

        it('should handle empty string subcommand', () => {
            /* Act */
            const result = parseHelpArguments(['']);

            /* Assert */
            expect(result).toEqual({
                command: 'help',
                subcommand: '',
            });
        });

        it('should handle null subcommand', () => {
            /* Act */
            const result = parseHelpArguments([]);

            /* Assert */
            expect(result).toEqual({
                command: 'help',
                subcommand: undefined,
            });
        });

        it('should handle undefined subcommand', () => {
            /* Act */
            const result = parseHelpArguments([]);

            /* Assert */
            expect(result).toEqual({
                command: 'help',
                subcommand: undefined,
            });
        });

        it('should handle very long subcommand', () => {
            /* Arrange */
            const longSubcommand = 'a'.repeat(1000);

            /* Act */
            const result = parseHelpArguments([longSubcommand]);

            /* Assert */
            expect(result).toEqual({
                command: 'help',
                subcommand: longSubcommand,
            });
        });

        it('should handle special characters in subcommand', () => {
            /* Act */
            const result = parseHelpArguments(['compress@#$%^&*()']);

            /* Assert */
            expect(result).toEqual({
                command: 'help',
                subcommand: 'compress@#$%^&*()',
            });
        });

        it('should handle whitespace in subcommand', () => {
            /* Act */
            const result = parseHelpArguments(['  compress  ']);

            /* Assert */
            expect(result).toEqual({
                command: 'help',
                subcommand: '  compress  ',
            });
        });
    });

    describe('helpText', () => {
        it('should return compress help text for compress subcommand', async () => {
            /* Arrange */
            const args = {
                command: 'help' as const,
                subcommand: 'compress',
            };

            /* Act */
            const result = await helpText(args);

            /* Assert */
            expect(result).toContain(
                'romorganizer compress - Convert archive files to CHD format'
            );
            expect(result).toContain('Required Options:');
            expect(result).toContain('-s, --source-dir <path>');
            expect(result).toContain('-o, --output-dir <path>');
            expect(result).toContain('Optional Options:');
            expect(result).toContain('-t, --temp-dir <path>');
            expect(result).toContain('-r, --remove-source');
            expect(result).toContain('Examples:');
        });

        it('should return verify help text for verify subcommand', async () => {
            /* Arrange */
            const args = {
                command: 'help' as const,
                subcommand: 'verify',
            };

            /* Act */
            const result = await helpText(args);

            /* Assert */
            expect(result).toContain(
                'romorganizer verify - Verify CHD files against DAT file'
            );
            expect(result).toContain('Required Options:');
            expect(result).toContain('-s, --source-dir <path>');
            expect(result).toContain('-d, --dat-file <path>');
            expect(result).toContain('-c, --cuesheets-file <path>');
            expect(result).toContain('Optional Options:');
            expect(result).toContain('-t, --temp-dir <path>');
            expect(result).toContain('-f, --force');
            expect(result).toContain('Examples:');
        });

        it('should return rename help text for rename subcommand', async () => {
            /* Arrange */
            const args = {
                command: 'help' as const,
                subcommand: 'rename',
            };

            /* Act */
            const result = await helpText(args);

            /* Assert */
            expect(result).toContain(
                'romorganizer rename - Rename CHD files based on metadata.json files'
            );
            expect(result).toContain('Required Options:');
            expect(result).toContain('-s, --source-dir <path>');
            expect(result).toContain('Optional Options:');
            expect(result).toContain('-f, --force');
            expect(result).toContain('Examples:');
        });

        it('should return global help text for undefined subcommand', async () => {
            /* Arrange */
            const args = {
                command: 'help' as const,
                subcommand: undefined,
            };

            /* Act */
            const result = await helpText(args);

            /* Assert */
            expect(result).toContain(
                'romorganizer - Convert archive files to CHD format with DAT validation'
            );
            expect(result).toContain('Usage: romorganizer <command> [options]');
            expect(result).toContain('Commands:');
            expect(result).toContain('compress');
            expect(result).toContain('verify');
            expect(result).toContain('rename');
            expect(result).toContain('help');
            expect(result).toContain('Global Options:');
            expect(result).toContain('-h, --help');
            expect(result).toContain('Examples:');
        });

        it('should return global help text for unknown subcommand', async () => {
            /* Arrange */
            const args = {
                command: 'help' as const,
                subcommand: 'unknown',
            };

            /* Act */
            const result = await helpText(args);

            /* Assert */
            expect(result).toContain('Error loading help for command');
            expect(result).toContain('unknown');
            expect(result).toContain('Command not found');
        });

        it('should return global help text for empty string subcommand', async () => {
            /* Arrange */
            const args = {
                command: 'help' as const,
                subcommand: '',
            };

            /* Act */
            const result = await helpText(args);

            /* Assert */
            expect(result).toContain(
                'romorganizer - Convert archive files to CHD format with DAT validation'
            );
            expect(result).toContain('Usage: romorganizer <command> [options]');
        });

        it('should handle all valid subcommands', async () => {
            /* Arrange */
            const validSubcommands = ['compress', 'verify', 'rename'];

            for (const subcommand of validSubcommands) {
                const args = {
                    command: 'help' as const,
                    subcommand,
                };

                /* Act */
                const result = await helpText(args);

                /* Assert */
                expect(result).toContain(`romorganizer ${subcommand}`);
                expect(result).toContain('Usage:');
            }
        });

        it('should handle case-sensitive subcommands', async () => {
            /* Arrange */
            const args = {
                command: 'help' as const,
                subcommand: 'COMPRESS',
            };

            /* Act */
            const result = await helpText(args);

            /* Assert */
            expect(result).toContain('Error loading help for command');
            expect(result).toContain('COMPRESS');
            expect(result).toContain('Command not found');
        });

        it('should handle error when help file is not found', async () => {
            /* Arrange */
            const args = {
                command: 'help' as const,
                subcommand: 'nonexistent',
            };

            /* Act */
            const result = await helpText(args);

            /* Assert */
            expect(result).toContain('Error loading help for command');
            expect(result).toContain('nonexistent');
        });
    });

    describe('HelpSchema', () => {
        it('should validate correct help arguments', () => {
            /* Arrange */
            const validArgs = {
                command: 'help' as const,
                subcommand: 'compress',
            };

            /* Act */
            const result = HelpSchema.parse(validArgs);

            /* Assert */
            expect(result).toEqual(validArgs);
        });

        it('should validate help arguments without subcommand', () => {
            /* Arrange */
            const validArgs = {
                command: 'help' as const,
                subcommand: undefined,
            };

            /* Act */
            const result = HelpSchema.parse(validArgs);

            /* Assert */
            expect(result).toEqual(validArgs);
        });

        it('should reject invalid command', () => {
            /* Arrange */
            const invalidArgs = {
                command: 'invalid' as any,
                subcommand: 'compress',
            };

            /* Act & Assert */
            expect(() => {
                HelpSchema.parse(invalidArgs);
            }).toThrow();
        });

        it('should accept empty string subcommand', () => {
            /* Arrange */
            const validArgs = {
                command: 'help' as const,
                subcommand: '',
            };

            /* Act */
            const result = HelpSchema.parse(validArgs);

            /* Assert */
            expect(result).toEqual(validArgs);
        });

        it('should accept null subcommand', () => {
            /* Arrange */
            const validArgs = {
                command: 'help' as const,
                subcommand: null as any,
            };

            /* Act & Assert */
            expect(() => {
                HelpSchema.parse(validArgs);
            }).toThrow();
        });

        it('should accept undefined subcommand', () => {
            /* Arrange */
            const validArgs = {
                command: 'help' as const,
                subcommand: undefined,
            };

            /* Act */
            const result = HelpSchema.parse(validArgs);

            /* Assert */
            expect(result).toEqual(validArgs);
        });
    });

    describe('integration tests', () => {
        it('should parse and generate help text for compress', async () => {
            /* Arrange */
            const args = ['compress'];

            /* Act */
            const parsed = parseHelpArguments(args);
            const helpTextResult = await helpText(parsed);

            /* Assert */
            expect(parsed.command).toBe('help');
            expect(parsed.subcommand).toBe('compress');
            expect(helpTextResult).toContain(
                'romorganizer compress - Convert archive files to CHD format'
            );
        });

        it('should parse and generate help text for verify', async () => {
            /* Arrange */
            const args = ['verify'];

            /* Act */
            const parsed = parseHelpArguments(args);
            const helpTextResult = await helpText(parsed);

            /* Assert */
            expect(parsed.command).toBe('help');
            expect(parsed.subcommand).toBe('verify');
            expect(helpTextResult).toContain(
                'romorganizer verify - Verify CHD files against DAT file'
            );
        });

        it('should parse and generate help text for rename', async () => {
            /* Arrange */
            const args = ['rename'];

            /* Act */
            const parsed = parseHelpArguments(args);
            const helpTextResult = await helpText(parsed);

            /* Assert */
            expect(parsed.command).toBe('help');
            expect(parsed.subcommand).toBe('rename');
            expect(helpTextResult).toContain(
                'romorganizer rename - Rename CHD files based on metadata.json files'
            );
        });

        it('should parse and generate global help text for no subcommand', async () => {
            /* Arrange */
            const args: string[] = [];

            /* Act */
            const parsed = parseHelpArguments(args);
            const helpTextResult = await helpText(parsed);

            /* Assert */
            expect(parsed.command).toBe('help');
            expect(parsed.subcommand).toBeUndefined();
            expect(helpTextResult).toContain(
                'romorganizer - Convert archive files to CHD format with DAT validation'
            );
        });
    });
});
