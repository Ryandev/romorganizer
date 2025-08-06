import commandLineArgs from 'command-line-args';
import { z } from 'zod';
import { guardDirectoryExists } from '../utils/guard';

/* Static method for argument parsing without creating a full runner instance */
export function parseVerifyArguments(
    args: string[]
): z.infer<typeof VerifySchema> {
    /* Check for help flag */
    if (args.includes('--help') || args.includes('-h')) {
        throw new Error('Help requested');
    }

    /* Parse arguments using command-line-args */
    const parsedOptions = commandLineArgs(verifyOptionDefinitions, {
        argv: args,
        partial: true,
    });

    /* Transform parsed options to match our schema */
    const transformedArgs = {
        command: 'verify' as const,
        sourceDir: parsedOptions['source-dir'],
        outputDir: parsedOptions['output-dir'],
        tempDir: parsedOptions['temp-dir'],
        datFile: parsedOptions['dat-file'],
        cuesheetsFile: parsedOptions['cuesheets-file'],
        removeSource: false /* verify doesn't use removeSource */,
        useDatFileName: false /* verify doesn't use useDatFileName */,
        rename: parsedOptions['rename'],
        overwrite: false /* verify doesn't use overwrite */,
        force: parsedOptions['force'],
    };

    /* Validate using Zod schema */
    try {
        return VerifySchema.parse(transformedArgs);
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

/* Command line option definitions for verify command */
const verifyOptionDefinitions: commandLineArgs.OptionDefinition[] = [
    {
        name: 'source-dir',
        alias: 's',
        type: String,
        multiple: false,
    },
    {
        name: 'dat-file',
        alias: 'd',
        type: String,
        multiple: false,
    },
    {
        name: 'cuesheets-file',
        alias: 'c',
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
        name: 'rename',
        alias: 'n',
        type: Boolean,
        multiple: false,
        defaultValue: false,
    },
    {
        name: 'force',
        alias: 'f',
        type: Boolean,
        multiple: false,
        defaultValue: false,
    },
];

/* Zod schema for verify command arguments */
const VerifySchema = z.object({
    command: z.literal('verify'),
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
    datFile: z.string().min(1, 'DAT file is required'),
    cuesheetsFile: z.string().min(1, 'Cuesheets file is required'),
    removeSource: z.boolean().default(false),
    useDatFileName: z.boolean().default(false),
    rename: z.boolean().default(false),
    overwrite: z.boolean().default(false),
    force: z.boolean().default(false),
});
