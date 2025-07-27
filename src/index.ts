import { loadArguments } from "./cli";
import createRunner from "./runner";
import storage from "./utils/storage";
import { log } from "./utils/logger";

async function run({ sourceDir, targetDir, removeSource }: { sourceDir: string, targetDir: string, removeSource: boolean }) {
    const files = await storage().list(sourceDir);
    console.log(files);
    for (const file of files) {
        const runner = createRunner(file);
        if (runner instanceof Error) {
            log.error(`Error creating runner for ${file}: ${runner.message}`);
            continue;
        }
        const results = await runner.start();
        console.log(results);
        for (const result of results) {
            await storage().move(result, targetDir);
        }
        if (removeSource) {
            await storage().remove(file);
            log.info(`Removed source file: ${file}`);
        }
    }
}

async function main() {
    const inputArguments = process.argv.slice(2);
    const launchParameters = loadArguments(inputArguments);
    await run({ 
        sourceDir: launchParameters.SOURCE_DIR, 
        targetDir: launchParameters.OUTPUT_DIR, 
        removeSource: launchParameters.REMOVE_SOURCE 
    });
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