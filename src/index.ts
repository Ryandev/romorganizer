import { loadArguments } from "./cli.js";
import createCHDRunner from "./runners/compress.js";
import createVerifyRunner from "./runners/verify.js";
import { loadDatFromPath } from "./utils/datLoader.js";
import { loadCuesheetsFromZip } from "./utils/cuesheetLoader.js";
import storage from "./utils/storage.js";
import { log } from "./utils/logger.js";
import path from "node:path";
import metadata from "./types/metadata.js";

async function compress({ sourceDir, targetDir, removeSource }: { sourceDir: string, targetDir: string, removeSource: boolean }) {
    const outputFiles: string[] = [];
    const files = await storage().list(sourceDir);
    log.info(`Found ${files.length} files in source directory`);
    
    for (const file of files) {
        const runner = createCHDRunner(file);
        if (runner instanceof Error) {
            log.error(`Error creating runner for ${file}: ${runner.message}`);
            continue;
        }
        const results = await runner.start();
        log.info(`Processing ${results.length} results from ${file}`);
        for (const result of results) {
            const outputFileName = path.basename(result);
            await storage().move(result, path.join(targetDir, outputFileName));
            outputFiles.push(result);
        }
        if (removeSource) {
            await storage().remove(file);
            log.info(`Removed source file: ${file}`);
        }
    }

    return outputFiles;
}

async function verify({ sourceDir, datFile, cuesheetsFile }: { sourceDir: string, datFile: string, cuesheetsFile: string }) {
    const outputFiles: string[] = [];
    const files = await storage().list(sourceDir);
    log.info(`Found ${files.length} files in source directory`);
    
    // Preload the DAT file once to avoid loading it for each file
    log.info(`Preloading DAT file: ${datFile}`);
    const dat = await loadDatFromPath(datFile);
    log.info(`Loaded DAT file with ${dat.games.length} games`);
    
    // Load cuesheets if provided
    log.info(`Loading cuesheets from: ${cuesheetsFile}`);
    const cuesheetEntries = await loadCuesheetsFromZip(cuesheetsFile);
    log.info(`Loaded ${cuesheetEntries.length} cuesheet entries`);
    
    for (const file of files) {
        const runner = createVerifyRunner(file, dat, cuesheetEntries);
        if (runner instanceof Error) {
            log.error(`Error creating verify runner for ${file}: ${runner.message}`);
            continue;
        }
        
        const result = await runner.start();
        log.info(`Verification result for ${file}: ${result.status} - ${result.message}`);

        const metadataFileName = `${path.basename(file, path.extname(file))}.metadata.json`;
        const metadataFilePath = path.join(sourceDir, metadataFileName);
        await metadata.writeFile({
            game: result.game ? {
                name: result.game.name,
                files: result.game.roms.map(rom => ({
                    name: rom.name,
                    size: rom.size,
                    sha1hex: rom.sha1hex,
                    ...(rom.crc && { crc: rom.crc }),
                    ...(rom.md5 && { md5: rom.md5 })
                })),
                ...(result.game.description && { description: result.game.description }),
                ...(result.game.category && { category: result.game.category })
            } : undefined,
            message: result.message,
            status: result.status,
            timestamp: new Date().toISOString()
        }, metadataFilePath);
    }
    
    return outputFiles;
}

async function main() {
    const inputArguments = process.argv.slice(2);
    const launchParameters = loadArguments(inputArguments);
    
    switch (launchParameters.command) {
        case 'compress': {
            const outputFiles = await compress({ 
                sourceDir: launchParameters.SOURCE_DIR, 
                targetDir: launchParameters.OUTPUT_DIR, 
                removeSource: launchParameters.REMOVE_SOURCE,
            });
            log.info(`Compression completed successfully, compressed files:\n ${outputFiles.join('\n ')}`);
            break;
        }
        case 'verify': {
            const outputFiles = await verify({ 
                sourceDir: launchParameters.SOURCE_DIR, 
                datFile: launchParameters.DAT_FILE,
                cuesheetsFile: launchParameters.CUESHEETS_FILE
            });
            log.info(`Verification completed successfully, verified files:\n ${outputFiles.join('\n ')}`);
            break;
        }
        default:
            throw new Error(`Unknown command: ${launchParameters.command}`);
    }
}

// ES Module equivalent of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        await main();
    } catch (error) {
        log.error('An error occurred');
        log.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}