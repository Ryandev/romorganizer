import commandLineArgs from 'command-line-args';
import { guardDirectoryExists } from '../utils/guard.js';
import { z } from 'zod';

/* Static method for argument parsing without creating a full runner instance */
export function parseCompressArguments(args: string[]): z.infer<typeof CompressSchema> {
    /* Check for help flag */
    if (args.includes('--help') || args.includes('-h')) {
        throw new Error('Help requested');
    }

    /* Parse arguments using command-line-args */
    const parsedOptions = commandLineArgs(compressOptionDefinitions, {
        argv: args,
        partial: true,
    });

    /* Transform parsed options to match our schema */
    const transformedArgs = {
        command: 'compress' as const,
        sourceDir: parsedOptions['source-dir'],
        outputDir: parsedOptions['output-dir'],
        tempDir: parsedOptions['temp-dir'],
        removeSource: parsedOptions['remove-source'],
        useDatFileName: parsedOptions['use-dat-file-name'],
        rename: parsedOptions['rename'],
        overwrite: parsedOptions['overwrite'],
        force: false, /* compress doesn't use force */
    };

    /* Validate using Zod schema */
    try {
        return CompressSchema.parse(transformedArgs);
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

/* Command line option definitions for compress command */
const compressOptionDefinitions: commandLineArgs.OptionDefinition[] = [
    {
        name: 'source-dir',
        alias: 's',
        type: String,
        multiple: false,
    },
    {
        name: 'output-dir',
        alias: 'o',
        type: String,
        multiple: false,
    },
    {
        name: 'temp-dir',
        alias: 't',
        type: String,
        multiple: false,
    },
    {
        name: 'remove-source',
        alias: 'r',
        type: Boolean,
        multiple: false,
        defaultValue: false,
    },
    {
        name: 'use-dat-file-name',
        alias: 'u',
        type: Boolean,
        multiple: false,
        defaultValue: false,
    },
    {
        name: 'rename',
        alias: 'n',
        type: Boolean,
        multiple: false,
        defaultValue: false,
    },
    {
        name: 'overwrite',
        alias: 'w',
        type: Boolean,
        multiple: false,
        defaultValue: false,
    }
];

/* Zod schema for compress command arguments */
const CompressSchema = z.object({
    command: z.literal('compress'),
    sourceDir: z
        .string()
        .min(1, 'Source directory is required')
        .refine(
            dir => {
                try {
                    guardDirectoryExists(dir);
                    return true;
                } catch {
                    return false;
                }
            },
            { message: 'Source directory does not exist or is not accessible' }
        ),
    outputDir: z
        .string()
        .min(1, 'Output directory is required')
        .refine(
            dir => {
                try {
                    guardDirectoryExists(dir);
                    return true;
                } catch {
                    return false;
                }
            },
            { message: 'Output directory does not exist or is not accessible' }
        ),
    tempDir: z.string().optional(),
    removeSource: z.boolean().default(false),
    overwrite: z.boolean().default(false),
});