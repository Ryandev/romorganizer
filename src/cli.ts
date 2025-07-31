import { guardDirectoryExists, guardFileExists } from './utils/guard';
import commandLineArgs from 'command-line-args';

export interface LaunchParameters {
    command: 'compress' | 'verify';
    SOURCE_DIR: string;
    OUTPUT_DIR: string;
    DAT_FILE: string;
    CUESHEETS_FILE: string;
    REMOVE_SOURCE: boolean;
    USE_DAT_FILE_NAME: boolean;
    RENAME: boolean;
    OVERWRITE: boolean;
}

// Define the command line option definitions with kebab-case naming
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
        name: 'help',
        alias: 'h',
        type: Boolean,
        multiple: false
    }
];

const COMMAND_NAME = 'romorganizer';

// Help text for the CLI
const helpText = `
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
`;

const compressHelpText = `
${COMMAND_NAME} compress - Convert archive files to CHD format

Usage: ${COMMAND_NAME} compress [options]

Required Options:
  -s, --source-dir <path>     Source directory containing files to process
  -o, --output-dir <path>     Output directory for processed files

Optional Options:
  -r, --remove-source         Remove source files after processing
  -w, --overwrite             Overwrite existing files in output directory
  -h, --help                  Show this help message

Examples:
  ${COMMAND_NAME} compress -s ./input -o ./output
  ${COMMAND_NAME} compress --source-dir ./input --output-dir ./output --remove-source
  ${COMMAND_NAME} compress --source-dir ./input --output-dir ./output --overwrite
`;

const verifyHelpText = `
${COMMAND_NAME} verify - Verify CHD files against DAT file

Usage: ${COMMAND_NAME} verify [options]

Required Options:
  -s, --source-dir <path>     Source directory containing CHD files to verify
  -d, --dat-file <path>       DAT file for validation (supports .dat and .zip files)
  -c, --cuesheets-file <path> Cuesheets zip file containing master .cue files

Optional Options:
  -n, --rename                Rename source files to game name from DAT file
  -h, --help                  Show this help message

Examples:
  ${COMMAND_NAME} verify -s ./input -d ./datfile.dat -c ./cuesheets.zip
  ${COMMAND_NAME} verify --source-dir ./input --dat-file ./datfile.zip --cuesheets-file ./cuesheets.zip --rename

Note: When using a zip file for --dat-file, the tool will automatically extract
      the zip and find the .dat file inside to use for validation.
      The --cuesheets-file is required for verification as it provides
      master .cue files for enhanced validation and metadata generation.
      When --rename is used, source files will be renamed to match the game name
      from the DAT file, and metadata files will be updated accordingly.
`;

function showHelp(command?: string): never {
    if (command === 'compress') {
        console.log(compressHelpText);
    } else if (command === 'verify') {
        console.log(verifyHelpText);
    } else {
        console.log(helpText);
    }
    
    /* Don't exit in test environment */
    if (process.env['NODE_ENV'] === 'test') {
        throw new Error('Help requested');
    }
    
    process.exit(0);
}

/**
 * Parses command line arguments and applies default values
 * @param args - Array of command line arguments
 * @returns Parsed options with fallbacks and default values applied
 */
function _commandLineArguments(args: string[]) {
    const options = commandLineArgs(optionDefinitions, { argv: args, partial: true });
    
    /* Apply fallbacks and default values */
    return {
        command: String(options['command']),
        'source-dir': String(options['source-dir'] ?? ''),
        'output-dir': String(options['output-dir'] ?? ''),
        'dat-file': String(options['dat-file'] ?? ''),
        'cuesheets-file': String(options['cuesheets-file'] ?? ''),
        'remove-source': Boolean(options['remove-source']),
        'use-dat-file-name': Boolean(options['use-dat-file-name']),
        'rename': Boolean(options['rename']),
        'overwrite': Boolean(options['overwrite']),
        'help': Boolean(options['help'])
    };
}

const _VALIDATE_ARGUMENTS = {
    compress: (options: Record<string, string | boolean>) => {
        const sourceDir = options['source-dir'];
        const outputDir = options['output-dir'];
        if (!sourceDir) {
            throw new Error('Missing required argument: --source-dir (-s)');
        }
        if (!outputDir) {
            throw new Error('Missing required argument: --output-dir (-o)');
        }
        guardDirectoryExists(
            sourceDir,
            `Source directory does not exist: ${sourceDir}`
        );
        guardDirectoryExists(
            outputDir,
            `Output directory does not exist: ${outputDir}`
        );
    },
    verify: (options: Record<string, string | boolean>) => {
        const sourceDir = options['source-dir'];
        const datFile = options['dat-file'];
        const cuesheetsFile = options['cuesheets-file'];
        if (!sourceDir) {
            throw new Error('Missing required argument: --source-dir (-s)');
        }
        if (!datFile) {
            throw new Error('Missing required argument: --dat-file (-d)');
        }
        if (!cuesheetsFile) {
            throw new Error('Missing required argument: --cuesheets-file (-c)');
        }
        guardDirectoryExists(
            sourceDir,
            `Source directory does not exist: ${sourceDir}`
        );
        guardFileExists(
            datFile,
            `DAT file does not exist: ${datFile}`
        );
        guardFileExists(
            cuesheetsFile,
            `Cuesheets file does not exist: ${cuesheetsFile}`
        );
    }
} as const

export function loadArguments(args: string[]): LaunchParameters {
    const options = _commandLineArguments(args);

    // Check for help option first
    if (options['help']) {
        showHelp(options['command']);
    }

    const command = options['command'] as 'compress' | 'verify';
    if ( !Object.keys(_VALIDATE_ARGUMENTS).includes(command) ) {
        showHelp(command);
    }

    _VALIDATE_ARGUMENTS[command](options);

    return {
        command,
        SOURCE_DIR: options['source-dir'],
        OUTPUT_DIR: options['output-dir'],
        DAT_FILE: options['dat-file'],
        CUESHEETS_FILE: options['cuesheets-file'],
        REMOVE_SOURCE: options['remove-source'],
        USE_DAT_FILE_NAME: options['use-dat-file-name'],
        RENAME: options['rename'],
        OVERWRITE: options['overwrite'],
    };
}
