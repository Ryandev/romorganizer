import { loadArguments } from "./cli";
import createRunner from "./runner";
import storage from "./utils/storage";
import { log } from "./utils/logger";

async function main() {
    const args = process.argv.slice(2);
    const launchParameters = loadArguments(args);
    console.log(launchParameters);
    // list files in the source directory
    const files = await storage().list(launchParameters.SOURCE_DIR);
    console.log(files);
    for (const file of files) {
        const runner = createRunner(file, 'chd');
        if (runner instanceof Error) {
            log.error(`Error creating runner for ${file}: ${runner.message}`);
            continue;
        }
        await runner.start();
        if (launchParameters.REMOVE_SOURCE) {
            await storage().remove(file);
            log.info(`Removed source file: ${file}`);
        }
    }
}

// ES Module equivalent of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        await main();
    } catch (error) {
        log.error('An error occurred');
        console.error(error);
        process.exit(1);
    }
}