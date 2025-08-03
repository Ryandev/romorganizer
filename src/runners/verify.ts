import chd from '../utils/chd';
import { guardValidString } from '../utils/guard';
import storage from '../utils/storage';
import path from 'path';
import { Dat, Game } from '../utils/dat';
import { CuesheetEntry } from '../utils/cuesheetLoader';
import hash from '../utils/hash';
import { IRunner } from './interface';
import { log } from "../utils/logger";
import metadata from "../types/metadata";
import { fileExtension } from './utils';

export class VerifyRunnerFile implements IRunner<{
    status: 'match' | 'partial' | 'none';
    message: string;
    game: Game | undefined;
}> {
    constructor(
        private readonly sourceFile: string,
        private readonly dat: Dat,
        private readonly cuesheetEntries: CuesheetEntry[]
    ) {
        this.sourceFile = sourceFile;
        this.dat = dat;
        this.cuesheetEntries = cuesheetEntries;
    }

    private async _work(compressedFilePath: string): Promise<{
        status: 'match' | 'partial' | 'none';
        message: string;
        game: Game | undefined;
    }> {
        const extension = fileExtension(compressedFilePath);
        if (extension !== 'chd') {
            throw new Error(`Unsupported file extension: ${extension}`);
        }


        const filePathCue = await chd.extract({
            chdFilePath: compressedFilePath,
            format: 'cue',
        });
        const outputDirectory = path.dirname(filePathCue);
        const fileListings = await storage().list(outputDirectory);

        /* Attempt to search dat file for all fileListings by sha1 */
        const matchingGames: Game[] = [];
        for (const filePath of fileListings) {
            const sha1 = await hash.calculateFileSha1(filePath);
            const matchingGame = this.dat.games.find(game =>
                game.roms.some(rom => rom.sha1hex === sha1)
            );
            if (matchingGame && !matchingGames.includes(matchingGame)) {
                matchingGames.push(matchingGame);
            }
        }

        if (matchingGames.length > 0) {
            return {
                status: matchingGames.length === 1 ? 'match' : 'partial',
                message: `Match via sha1 hash`,
                game: matchingGames[0],
            };
        }

        /* Attempt to find match by combined bin size */
        const allBinFiles = fileListings.filter(filePath =>
            filePath.endsWith('.bin')
        );
        const allBinSizes = await Promise.all(
            allBinFiles.map(filePath => storage().size(filePath))
        );
        const combinedBinSize = allBinSizes.reduce(
            (acc, size) => acc + size,
            0
        );

        const sizeMatches: Game[] = [];

        /* Attempt to find match by combined bin size */
        for (const game of this.dat.games) {
            const roms = game.roms.filter(rom => rom.name.endsWith('.bin'));
            const romSize = roms.reduce((acc, rom) => acc + rom.size, 0);
            if (romSize === combinedBinSize) {
                sizeMatches.push(game);
            }
        }

        if (sizeMatches.length > 0) {
            return {
                status: sizeMatches.length === 1 ? 'match' : 'partial',
                message: `Match via combined bin size`,
                game: sizeMatches[0],
            };
        }

        let closestMatch: Game | undefined = undefined;
        let closestMatchSizeDiff = Number.MAX_SAFE_INTEGER;

        for (const game of this.dat.games) {
            const roms = game.roms.filter(rom => rom.name.endsWith('.bin'));
            const romSize = roms.reduce((acc, rom) => acc + rom.size, 0);
            const sizeDiff = Math.abs(romSize - combinedBinSize);
            if (sizeDiff < closestMatchSizeDiff || closestMatch === undefined) {
                closestMatch = game;
                closestMatchSizeDiff = sizeDiff;
            }
        }

        return closestMatchSizeDiff < 1000
            ? {
                  status: 'partial',
                  message: `No matching game found for ${compressedFilePath}, bytes-delta: ${closestMatchSizeDiff}, percent-delta: ${(1 - closestMatchSizeDiff / combinedBinSize) * 100}%`,
                  game: closestMatch,
              }
            : {
                  status: 'none',
                  message: `No match found`,
                  game: undefined,
              };
    }

    async start(): Promise<{
        status: 'match' | 'partial' | 'none';
        message: string;
        game: Game | undefined;
    }> {
        const result = await this._work(this.sourceFile);
        guardValidString(result);
        return result;
    }
}

export class VerifyRunnerDirectory implements IRunner<string[]> {
    constructor(
        private readonly sourceDir: string,
        private readonly dat: Dat,
        private readonly cuesheetEntries: CuesheetEntry[],
        private readonly rename: boolean,
        private readonly force: boolean,
    ) {
        this.sourceDir = sourceDir;
        this.dat = dat;
        this.cuesheetEntries = cuesheetEntries;
        this.rename = rename;
        this.force = force;
    }

    async start(): Promise<string[]> {
        const outputFiles: string[] = [];
        const files = await storage().list(this.sourceDir, {
            avoidHiddenFiles: true,
            recursive: true,
        });
        log.info(`Found ${files.length} files in source directory`);

        for (const file of files) {
            /* Check if metadata.json already exists for this file */
            const baseFileName = path.basename(file, path.extname(file));
            const metadataFileName = `${baseFileName}.metadata.json`;
            const metadataFilePath = path.join(this.sourceDir, metadataFileName);

            const metadataExists = await storage().exists(metadataFilePath);
            if (metadataExists && !this.force) {
                log.info(
                    `Skipping ${file} - metadata.json already exists (use --force to re-verify)`
                );
                continue;
            }

            const runner = new VerifyRunnerFile(file, this.dat, this.cuesheetEntries);
            if (runner instanceof Error) {
                log.error(
                    `Error creating verify runner for ${file}: ${runner.message}`
                );
                continue;
            }

            const result = await runner.start();
            log.info(
                `Verification result for ${file}: ${result.status} - ${result.message}`
            );

            let finalFileName = path.basename(file);
            let finalMetadataFileName = `${path.basename(file, path.extname(file))}.metadata.json`;

            /* Rename file if requested and we have a game match */
            if (this.rename && result.game && result.status !== 'none') {
                const gameName = result.game.name;
                const fileExtension = path.extname(file);
                const newFileName = `${gameName}${fileExtension}`;
                const newFilePath = path.join(this.sourceDir, newFileName);

                await storage().move(file, newFilePath);
                log.info(`Renamed ${finalFileName} to ${newFileName}`);
                finalFileName = newFileName;
                finalMetadataFileName = `${gameName}.metadata.json`;
            }

            const finalMetadataFilePath = path.join(
                this.sourceDir,
                finalMetadataFileName
            );
            await metadata.writeFile(
                {
                    game: result.game
                        ? {
                                name: result.game.name,
                                files: result.game.roms.map(rom => ({
                                    name: rom.name,
                                    size: rom.size,
                                    sha1hex: rom.sha1hex,
                                    ...(rom.crc && { crc: rom.crc }),
                                    ...(rom.md5 && { md5: rom.md5 }),
                                })),
                                ...(result.game.description && {
                                    description: result.game.description,
                                }),
                                ...(result.game.category && {
                                    category: result.game.category,
                                }),
                            }
                        : undefined,
                    message: result.message,
                    status: result.status,
                    timestamp: new Date().toISOString(),
                },
                finalMetadataFilePath
            );

            outputFiles.push(file);
        }

        return outputFiles;
    }
}