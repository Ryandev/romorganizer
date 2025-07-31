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

function showHelp(command?: string): void {
    if (command === 'compress') {
        console.log(compressHelpText);
    } else if (command === 'verify') {
        console.log(verifyHelpText);
    } else {
        console.log(helpText);
    }
    process.exit(0);
}

export function loadArguments(args: string[]): LaunchParameters {
    // Parse command line arguments
    const options = commandLineArgs(optionDefinitions, { argv: args, partial: true });

    // Check for help option first
    if (options['help']) {
        showHelp(options['command']);
    }

    // Extract command
    const command = options['command'];
    if (!command || (command !== 'compress' && command !== 'verify')) {
        throw new Error('Missing or invalid command. Use "compress" or "verify"');
    }

    // Extract values from parsed options
    const sourceDir = options['source-dir'];
    const outputDir = options['output-dir'];
    const datFile = options['dat-file'];
    const cuesheetsFile = options['cuesheets-file'];
    const removeSource = options['remove-source'] || false;
    const useDatFileName = options['use-dat-file-name'] || false;
    const rename = options['rename'] || false;
    const overwrite = options['overwrite'] || false;

    // Validate source directory (required for both commands)
    if (!sourceDir) {
        throw new Error('Missing required argument: --source-dir (-s)');
    }
    guardDirectoryExists(
        sourceDir,
        `Source directory does not exist: ${sourceDir}`
    );

    // Command-specific validation
    if (command === 'compress') {
        if (!sourceDir) {
            throw new Error('Missing required argument: --source-dir (-s)');
        }
        guardDirectoryExists(
            sourceDir,
            `Source directory does not exist: ${sourceDir}`
        );
        if (!outputDir) {
            throw new Error('Missing required argument: --output-dir (-o)');
        }
        guardDirectoryExists(
            outputDir,
            `Output directory does not exist: ${outputDir}`
        );
    } else if (command === 'verify') {
        if (!datFile) {
            throw new Error('Missing required argument: --dat-file (-d)');
        }
        guardFileExists(
            datFile,
            `DAT file does not exist: ${datFile}`
        );
        if (!cuesheetsFile) {
            throw new Error('Missing required argument: --cuesheets-file (-c)');
        }
        guardFileExists(
            cuesheetsFile,
            `Cuesheets file does not exist: ${cuesheetsFile}`
        );
    }

    return {
        command,
        SOURCE_DIR: sourceDir,
        OUTPUT_DIR: outputDir,
        DAT_FILE: datFile,
        CUESHEETS_FILE: cuesheetsFile,
        REMOVE_SOURCE: removeSource,
        USE_DAT_FILE_NAME: useDatFileName,
        RENAME: rename,
        OVERWRITE: overwrite,
    };
}
