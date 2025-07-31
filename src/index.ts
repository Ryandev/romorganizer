import { loadArguments } from "./cli.js";
import createCHDRunner from "./runners/compress.js";
import createVerifyRunner from "./runners/verify.js";
import { loadDatFromPath } from "./utils/datLoader.js";
import { loadCuesheetsFromZip } from "./utils/cuesheetLoader.js";
import storage from "./utils/storage.js";
import { log } from "./utils/logger.js";
import path from "node:path";
import metadata from "./types/metadata.js";

/* Group files by basename with different extensions, Each group is a list of files with the same basename */
async function _files(sourceDir: string): Promise<string[][]> {
    const files = await storage().list(sourceDir, { recursive: true, avoidHiddenFiles: true });
    const groups: Record<string, string[]> = {};
    for (const file of files) {
        const basename = path.basename(file, path.extname(file));
        if (!groups[basename]) {
            groups[basename] = [];
        }
        groups[basename].push(file);
    }
    return Object.values(groups);
}

async function compress({ sourceDir, targetDir, removeSource, overwrite }: { sourceDir: string, targetDir: string, removeSource: boolean, overwrite: boolean }) {
    const outputFiles: string[] = [];
    const fileGroups = await _files(sourceDir);
    log.info(`Found ${fileGroups.length} files in source directory`);
    
    for (const files of fileGroups) {
        const runner = createCHDRunner(files);
        if (runner instanceof Error) {
            log.error(`Error creating runner for ${files}: ${runner.message}`);
            continue;
        }
        const outputAlreadyExists = await storage().exists(runner.outputFile());
        if (outputAlreadyExists && !overwrite) {
            log.info(`Skipping ${files} - output file already exists in output directory`);
            continue;
        }
        const results = await runner.start();
        log.info(`Processing ${results.length} results from ${files}`);
        for (const result of results) {
            const outputFileName = path.basename(result);
            const outputPath = path.join(targetDir, outputFileName);
            
            await storage().move(result, outputPath);
            outputFiles.push(result);
        }
        if (removeSource) {
            await Promise.all(files.map(file => storage().remove(file)));
            log.info(`Removed source files: ${files.join(', ')}`);
        }
    }

    return outputFiles;
}

async function verify({ sourceDir, datFile, cuesheetsFile, rename, force }: { sourceDir: string, datFile: string, cuesheetsFile: string, rename: boolean, force: boolean }) {
    const outputFiles: string[] = [];
    const files = await storage().list(sourceDir, { avoidHiddenFiles: true, recursive: true });
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
        // Check if metadata.json already exists for this file
        const baseFileName = path.basename(file, path.extname(file));
        const metadataFileName = `${baseFileName}.metadata.json`;
        const metadataFilePath = path.join(sourceDir, metadataFileName);
        
        const metadataExists = await storage().exists(metadataFilePath);
        if (metadataExists && !force) {
            log.info(`Skipping ${file} - metadata.json already exists (use --force to re-verify)`);
            continue;
        }
        
        const runner = createVerifyRunner(file, dat, cuesheetEntries);
        if (runner instanceof Error) {
            log.error(`Error creating verify runner for ${file}: ${runner.message}`);
            continue;
        }
        
        const result = await runner.start();
        log.info(`Verification result for ${file}: ${result.status} - ${result.message}`);

        let finalFileName = path.basename(file);
        let finalMetadataFileName = `${path.basename(file, path.extname(file))}.metadata.json`;

        // Rename file if requested and we have a game match
        if (rename && result.game && result.status !== 'none') {
            const gameName = result.game.name;
            const fileExtension = path.extname(file);
            const newFileName = `${gameName}${fileExtension}`;
            const newFilePath = path.join(sourceDir, newFileName);
            
            await storage().move(file, newFilePath);
            log.info(`Renamed ${finalFileName} to ${newFileName}`);
            finalFileName = newFileName;
            finalMetadataFileName = `${gameName}.metadata.json`;
        }

        const finalMetadataFilePath = path.join(sourceDir, finalMetadataFileName);
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
        }, finalMetadataFilePath);
        
        outputFiles.push(file);
    }
    
    return outputFiles;
}

async function main() {
    const inputArguments = process.argv.slice(2);
    const launchParameters = loadArguments(inputArguments);
    
    switch (launchParameters.command) {
        case 'compress': {
            const outputFiles = await compress({ 
                sourceDir: launchParameters.sourceDir, 
                targetDir: launchParameters.outputDir, 
                removeSource: launchParameters.removeSource,
                overwrite: launchParameters.overwrite,
            });
            log.info(`Compression completed successfully, compressed files:\n ${outputFiles.join('\n ')}`);
            break;
        }
        case 'verify': {
            const outputFiles = await verify({ 
                sourceDir: launchParameters.sourceDir, 
                datFile: launchParameters.datFile,
                cuesheetsFile: launchParameters.cuesheetsFile,
                rename: launchParameters.rename,
                force: launchParameters.force
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
    // eslint-disable-next-line unicorn/prefer-top-level-await
    (async () => {
        try {
            await main();
        } catch (error) {
            log.error('An error occurred');
            log.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    })();
}