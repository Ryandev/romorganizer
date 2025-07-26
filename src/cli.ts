import { guardDirectoryExists } from './guard';
import commandLineArgs from 'command-line-args';

export interface LaunchParameters {
    SOURCE_DIR: string;
    OUTPUT_DIR: string;
    REMOVE_SOURCE: boolean;
}

// Define the command line option definitions with kebab-case naming
const optionDefinitions: commandLineArgs.OptionDefinition[] = [
    { name: 'source-dir', alias: 's', type: String, multiple: false },
    { name: 'output-dir', alias: 'o', type: String, multiple: false },
    { name: 'remove-source', alias: 'r', type: String, multiple: false },
];

export function loadArguments(args: string[]): LaunchParameters {
    // Parse command line arguments
    const options = commandLineArgs(optionDefinitions, { argv: args, partial: true });

    // Extract values from parsed options
    const sourceDir = options['source-dir'];
    const outputDir = options['output-dir'];
    const removeSourceValue = options['remove-source'];

    // Convert remove-source value to boolean
    const removeSource = removeSourceValue ? [
        'true',
        '1',
        'yes',
        'y',
        't',
    ].includes(removeSourceValue) : false;

    // Validation
    if (!sourceDir) {
        throw new Error('Missing arg: SOURCE_DIR');
    }
    guardDirectoryExists(
        sourceDir,
        `Source directory does not exist: ${sourceDir}`
    );
    if (!outputDir) {
        throw new Error('Missing arg: OUTPUT_DIR');
    }
    guardDirectoryExists(
        outputDir,
        `Output directory does not exist: ${outputDir}`
    );

    return {
        SOURCE_DIR: sourceDir,
        OUTPUT_DIR: outputDir,
        REMOVE_SOURCE: removeSource,
    };
}
