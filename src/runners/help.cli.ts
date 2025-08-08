import { z } from 'zod';

const COMMAND_NAME = 'romorganizer';

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
        subcommand: args[0] /* First argument after 'help' */,
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

/* Available commands and their help file imports */
const COMMAND_HELP_IMPORTS = {
    compress: () => import('./compress.help').then(m => m.COMPRESS_HELP_TEXT),
    verify: () => import('./verify.help').then(m => m.VERIFY_HELP_TEXT),
    rename: () => import('./rename.help').then(m => m.RENAME_HELP_TEXT),
} as const;

/* Global help text */
const GLOBAL_HELP_TEXT = `
${COMMAND_NAME} - Convert archive files to CHD format with DAT validation

Usage: ${COMMAND_NAME} <command> [options]

Commands:
  compress    Convert archive files to CHD format
  verify      Verify CHD files against DAT file
  rename      Rename CHD files based on DAT file matches
  help        Show help information

Global Options:
  -h, --help                  Show this help message

Examples:
  ${COMMAND_NAME} compress -s ./input -o ./output
  ${COMMAND_NAME} verify -s ./input -d ./datfile.dat -c ./cuesheets.zip
  ${COMMAND_NAME} rename -s ./input -d ./datfile.dat -c ./cuesheets.zip
  ${COMMAND_NAME} help compress

Use '${COMMAND_NAME} <command> --help' for command-specific help.
`;

export async function helpText(parameters: z.infer<typeof HelpSchema>): Promise<string> {
    if (parameters.subcommand && parameters.subcommand in COMMAND_HELP_IMPORTS) {
        try {
            return await COMMAND_HELP_IMPORTS[parameters.subcommand as keyof typeof COMMAND_HELP_IMPORTS]();
        } catch (error) {
            return `Error loading help for command '${parameters.subcommand}': ${error instanceof Error ? error.message : String(error)}`;
        }
    }
    
    /* If subcommand is provided but not found, show error */
    if (parameters.subcommand && parameters.subcommand !== '') {
        return `Error loading help for command '${parameters.subcommand}': Command not found`;
    }
    
    return GLOBAL_HELP_TEXT;
}
