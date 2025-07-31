import { z } from 'zod';
import commandLineArgs from 'command-line-args';
import { guardDirectoryExists } from './utils/guard.js';

const COMMAND_NAME = 'romorganizer';

/* Define command line option definitions */
const optionDefinitions: commandLineArgs.OptionDefinition[] = [
    { 
        name: 'command',
        type: String,
        multiple: false,
        defaultOption: true
    },
    { 
        name: 'source-dir', 
        alias: 's', 
        type: String, 
        multiple: false
    },
    { 
        name: 'output-dir', 
        alias: 'o', 
        type: String, 
        multiple: false
    },
    { 
        name: 'dat-file', 
        alias: 'd', 
        type: String, 
        multiple: false
    },
    { 
        name: 'cuesheets-file', 
        alias: 'c', 
        type: String, 
        multiple: false
    },
    { 
        name: 'remove-source', 
        alias: 'r', 
        type: Boolean, 
        multiple: false, 
        defaultValue: false
    },
    { 
        name: 'use-dat-file-name', 
        alias: 'u', 
        type: Boolean, 
        multiple: false,
        defaultValue: false
    },
    { 
        name: 'rename', 
        alias: 'n', 
        type: Boolean, 
        multiple: false,
        defaultValue: false
    },
    { 
        name: 'overwrite', 
        alias: 'w', 
        type: Boolean, 
        multiple: false,
        defaultValue: false
    },
    {
        name: 'force',
        alias: 'f',
        type: Boolean,
        multiple: false,
        defaultValue: false
    },
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        multiple: false,
        defaultValue: false
    }
];

/* Zod schema for command line arguments */
const CompressSchema = z.object({
    command: z.literal('compress'),
    sourceDir: z.string().min(1, 'Source directory is required').refine(
        (dir) => {
            try {
                guardDirectoryExists(dir);
                return true;
            } catch {
                return false;
            }
        },
        { message: 'Source directory does not exist or is not accessible' }
    ),
    outputDir: z.string().min(1, 'Output directory is required').refine(
        (dir) => {
            try {
                guardDirectoryExists(dir);
                return true;
            } catch {
                return false;
            }
        },
        { message: 'Output directory does not exist or is not accessible' }
    ),
    removeSource: z.boolean().default(false),
    useDatFileName: z.boolean().default(false),
    rename: z.boolean().default(false),
    overwrite: z.boolean().default(false),
    force: z.boolean().default(false),
    help: z.boolean().default(false),
});

const VerifySchema = z.object({
    command: z.literal('verify'),
    sourceDir: z.string().min(1, 'Source directory is required').refine(
        (dir) => {
            try {
                guardDirectoryExists(dir);
                return true;
            } catch {
                return false;
            }
        },
        { message: 'Source directory does not exist or is not accessible' }
    ),
    outputDir: z.string().optional(),
    datFile: z.string().min(1, 'DAT file is required'),
    cuesheetsFile: z.string().min(1, 'Cuesheets file is required'),
    removeSource: z.boolean().default(false),
    useDatFileName: z.boolean().default(false),
    rename: z.boolean().default(false),
    overwrite: z.boolean().default(false),
    force: z.boolean().default(false),
    help: z.boolean().default(false),
});

const CommandSchema = z.discriminatedUnion('command', [CompressSchema, VerifySchema]);

export type LaunchParameters = z.infer<typeof CommandSchema>;

/* Help text for commands */
const HELP_TEXT_MAP = {
    compress: `
${COMMAND_NAME} compress - Convert archive files to CHD format

Usage: ${COMMAND_NAME} compress [options]

Required Options:
  -s, --source-dir <path>     Source directory containing files to compress
  -o, --output-dir <path>     Output directory for compressed CHD files

Optional Options:
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
  -n, --rename                Rename source files to game name from DAT file
  -f, --force                 Force re-verification even if metadata.json exists
  -h, --help                  Show this help message

Examples:
  ${COMMAND_NAME} verify -s ./input -d ./datfile.dat -c ./cuesheets.zip
  ${COMMAND_NAME} verify --source-dir ./input --dat-file ./datfile.zip --cuesheets-file ./cuesheets.zip --rename
  ${COMMAND_NAME} verify --source-dir ./input --dat-file ./datfile.dat --cuesheets-file ./cuesheets.zip --force
`,
    global: `
${COMMAND_NAME} - Convert archive files to CHD format with DAT validation

Usage: ${COMMAND_NAME} <command> [options]

Commands:
  compress    Convert archive files to CHD format
  verify      Verify CHD files against DAT file

Global Options:
  -h, --help                  Show this help message

Examples:
  ${COMMAND_NAME} compress -s ./input -o ./output
  ${COMMAND_NAME} verify -s ./input -d ./datfile.dat -c ./cuesheets.zip
  ${COMMAND_NAME} compress --source-dir ./input --output-dir ./output --remove-source

Use '${COMMAND_NAME} <command> --help' for command-specific help.
`
} as const;

/**
 * Shows help text for the specified command or global help
 */
function showHelp(command?: string): never {
    const helpText = command && command in HELP_TEXT_MAP 
        ? HELP_TEXT_MAP[command as keyof typeof HELP_TEXT_MAP]
        : HELP_TEXT_MAP.global;
    
    console.log(helpText);
    
    /* Don't exit in test environment */
    if (process.env['NODE_ENV'] === 'test') {
        throw new Error('Help requested');
    }
    
    process.exit(0);
}

/**
 * Parses command line arguments using command-line-args and validates them using Zod
 */
function _parseCommandLineArguments(args: string[]): LaunchParameters {
    // Check for empty args first
    if (args.length === 0) {
        showHelp();
    }

    // Check if first argument is a valid command
    const command = args[0];
    if (command === '--help' || command === '-h') {
        showHelp();
    }

    if (!command || !Object.keys(HELP_TEXT_MAP).includes(command)) {
        // If first arg is not a valid command, show help
        showHelp();
    }

    try {
        // Parse arguments using command-line-args
        const parsedOptions = commandLineArgs(optionDefinitions, { argv: args, partial: true });

        // Transform parsed options to match our schema
        const transformedArgs = {
            command,
            sourceDir: parsedOptions['source-dir'],
            outputDir: parsedOptions['output-dir'],
            datFile: parsedOptions['dat-file'],
            cuesheetsFile: parsedOptions['cuesheets-file'],
            removeSource: parsedOptions['remove-source'] || false,
            useDatFileName: parsedOptions['use-dat-file-name'] || false,
            rename: parsedOptions['rename'] || false,
            overwrite: parsedOptions['overwrite'] || false,
            force: parsedOptions['force'] || false,
            help: parsedOptions['help'] || false,
        };

        // Validate with Zod schema
        return CommandSchema.parse(transformedArgs);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const zodError = error as z.ZodError<unknown>;
            const messages = zodError.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`).join('\n');
            throw new Error(`Validation error:\n${messages}`);
        }
        throw error;
    }
}

/**
 * Loads and validates command line arguments
 */
export function loadArguments(args: string[]): LaunchParameters {
    return _parseCommandLineArguments(args);
}
