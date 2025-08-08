import commandLineArgs from 'command-line-args';
import { z } from 'zod';
import { guardDirectoryExists } from '../utils/guard';

/* Static method for argument parsing without creating a full runner instance */
export function parseRenameArguments(
    args: string[]
): z.infer<typeof RenameSchema> {
    /* Check for help flag */
    if (args.includes('--help') || args.includes('-h')) {
        throw new Error('Help requested');
    }

    /* Parse arguments using command-line-args */
    const parsedOptions = commandLineArgs(renameOptionDefinitions, {
        argv: args,
        partial: true,
    });

    /* Transform parsed options to match our schema */
    const transformedArgs = {
        command: 'rename' as const,
        sourceDir: parsedOptions['source-dir'],
        outputDir: parsedOptions['output-dir'],
        tempDir: undefined /* rename doesn't use tempDir */,
        datFile: undefined /* rename doesn't use datFile */,
        cuesheetsFile: undefined /* rename doesn't use cuesheetsFile */,
        removeSource: false /* rename doesn't use removeSource */,
        useDatFileName: false /* rename doesn't use useDatFileName */,
        rename: false /* rename command doesn't need rename flag */,
        overwrite: false /* rename doesn't use overwrite */,
        force: parsedOptions['force'],
    };

    /* Validate using Zod schema */
    try {
        return RenameSchema.parse(transformedArgs);
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

/* Command line option definitions for rename command */
const renameOptionDefinitions: commandLineArgs.OptionDefinition[] = [
    {
        name: 'source-dir',
        alias: 's',
        type: String,
        multiple: false,
    },
    {
        name: 'force',
        alias: 'f',
        type: Boolean,
        multiple: false,
        defaultValue: false,
    },
];

/* Zod schema for rename command arguments */
const RenameSchema = z.object({
    command: z.literal('rename'),
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
    outputDir: z.string().optional(),
    tempDir: z.string().optional(),
    datFile: z.string().optional(),
    cuesheetsFile: z.string().optional(),
    removeSource: z.boolean().default(false),
    useDatFileName: z.boolean().default(false),
    rename: z.boolean().default(false),
    overwrite: z.boolean().default(false),
    force: z.boolean().default(false),
});
