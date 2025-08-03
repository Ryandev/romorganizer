import { z } from 'zod';

const COMMAND_NAME = 'romorganizer';

/* Help text for commands */
const HELP_TEXT_MAP = {
    compress: `
${COMMAND_NAME} compress - Convert archive files to CHD format

Usage: ${COMMAND_NAME} compress [options]

Required Options:
  -s, --source-dir <path>     Source directory containing files to compress
  -o, --output-dir <path>     Output directory for compressed CHD files

Optional Options:
  -t, --temp-dir <path>       Temporary directory for processing (default: system temp)
  -r, --remove-source         Remove source files after successful compression
  -u, --use-dat-file-name     Use DAT file name for output files
  -n, --rename                Rename source files to game name from DAT file
  -w, --overwrite             Overwrite existing output files
  -h, --help                  Show this help message

Examples:
  ${COMMAND_NAME} compress -s ./input -o ./output
  ${COMMAND_NAME} compress --source-dir ./input --output-dir ./output --remove-source
  ${COMMAND_NAME} compress --source-dir ./input --output-dir ./output --overwrite
`,
    verify: `
${COMMAND_NAME} verify - Verify CHD files against DAT file

Usage: ${COMMAND_NAME} verify [options]

Required Options:
  -s, --source-dir <path>     Source directory containing CHD files to verify
  -d, --dat-file <path>       DAT file for validation (supports .dat and .zip files)
  -c, --cuesheets-file <path> Cuesheets zip file containing master .cue files

Optional Options:
  -t, --temp-dir <path>       Temporary directory for processing (default: system temp)
  -n, --rename                Rename source files to game name from DAT file
  -f, --force                 Force re-verification even if metadata.json exists
  -h, --help                  Show this help message

Examples:
  ${COMMAND_NAME} verify -s ./input -d ./datfile.dat -c ./cuesheets.zip
  ${COMMAND_NAME} verify --source-dir ./input --dat-file ./datfile.zip --cuesheets-file ./cuesheets.zip --rename
  ${COMMAND_NAME} verify --source-dir ./input --dat-file ./datfile.dat --cuesheets-file ./cuesheets.zip --force
`,
    help: `
${COMMAND_NAME} help - Show help information

Usage: ${COMMAND_NAME} help [command]

Commands:
  compress    Convert archive files to CHD format
  verify      Verify CHD files against DAT file
  help        Show this help message

Examples:
  ${COMMAND_NAME} help
  ${COMMAND_NAME} help compress
  ${COMMAND_NAME} help verify
`,
    global: `
${COMMAND_NAME} - Convert archive files to CHD format with DAT validation

Usage: ${COMMAND_NAME} <command> [options]

Commands:
  compress    Convert archive files to CHD format
  verify      Verify CHD files against DAT file
  help        Show help information

Global Options:
  -h, --help                  Show this help message

Examples:
  ${COMMAND_NAME} compress -s ./input -o ./output
  ${COMMAND_NAME} verify -s ./input -d ./datfile.dat -c ./cuesheets.zip
  ${COMMAND_NAME} help compress

Use '${COMMAND_NAME} <command> --help' for command-specific help.
`,
} as const;

/* Zod schema for help command arguments */
export const HelpSchema = z.object({
    command: z.literal('help'),
    subcommand: z.string().optional(),
});


/* Static method for argument parsing without creating a full runner instance */
export function parseHelpArguments(args: string[]): z.infer<typeof HelpSchema> {
    /* Check for help flag */
    if (args.includes('--help') || args.includes('-h')) {
        throw new Error('Help requested');
    }

    /* Transform parsed options to match our schema */
    const transformedArgs = {
        command: 'help' as const,
        subcommand: args[0], /* First argument after 'help' */
    };

    /* Validate using Zod schema */
    try {
        return HelpSchema.parse(transformedArgs);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const messages = error.issues
                .map(issue => `${issue.path.join('.')}: ${issue.message}`)
                .join('\n');
            throw new Error(messages);
        }
        throw error;
    }
}

export function helpText(parameters: z.infer<typeof HelpSchema>): string {
    if (parameters.subcommand && parameters.subcommand in HELP_TEXT_MAP) {
        return HELP_TEXT_MAP[parameters.subcommand as keyof typeof HELP_TEXT_MAP];
    }
    return HELP_TEXT_MAP.global;
}