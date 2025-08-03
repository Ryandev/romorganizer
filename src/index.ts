import { log } from './utils/logger.js';
import createHelpRunner from './runners/help.builder.js';
import createVerifyRunner from './runners/verify.builder.js';
import createCompressRunner from './runners/compress.builder.js';

async function main(inputArguments: string[]) {
    /* Check for empty args first */
    if (inputArguments.length === 0) {
        throw new Error('No command provided. Use --help for usage information.');
    }

    /* Check if first argument is a valid command */
    const [command, ...subArguments] = inputArguments;
    
    switch (command) {
        /* Handle help flags - these will be caught by the switch statement in index.ts */
        case 'help':
        case '-h':
        case '--help': {
            const builder = await createHelpRunner(subArguments);
            const runner = await builder.create();
            const text = await runner.start();
            console.log(text);
            break;
        }
        case 'compress': {
            const builder = await createCompressRunner(subArguments);
            const runner = await builder.create();
            const outputFiles = await runner.start();
            log.info(
                `Compression completed successfully, compressed files:\n ${outputFiles.join('\n ')}`
            );
            break;
        }

        case 'verify': {
            const builder = await createVerifyRunner(subArguments);
            const runner = await builder.create();
            const outputFiles = await runner.start();
            log.info(
                `Verification completed successfully, verified files:\n ${outputFiles.join('\n ')}`
            );
            break;
        }
        default: {
            throw new Error(`Unknown command: ${command}`);
        }
    }
}

/* ES Module equivalent of require.main === module */
if (import.meta.url === `file://${process.argv[1]}`) {
    /* eslint-disable-next-line unicorn/prefer-top-level-await */
    (async () => {
        const inputArguments = process.argv.slice(2);
        try {
            await main(inputArguments);
        } catch (error) {
            log.error('An error occurred');
            log.error(
                `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
            );
            throw new Error('Application failed with exit code 1');
        }
    })();
}
