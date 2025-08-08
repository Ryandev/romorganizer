import chd from '../utils/chd';
import storage from '../utils/storage';
import path from 'node:path';
import { Dat, Game } from '../utils/dat';
import { CuesheetEntry } from '../utils/cuesheet-loader';
import hash from '../utils/hash';
import { IRunner } from './interface';
import { log } from '../utils/logger';
import { fileExtension } from './utils';
import storageDecorator from '../utils/storage.decorator';

export class RenameRunnerFile
    implements
        IRunner<{
            status: 'match' | 'partial' | 'none';
            message: string;
            game: Game | undefined;
        }>
{
    private readonly storage = storageDecorator.withCleanup(storage());

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
        const fileListings = await this.storage.list(outputDirectory);

        log.info(`Searching ${fileListings} for matches`)

        /* Attempt to search dat file for all fileListings by sha1 */
        const matchingGames: Game[] = [];
        for (const filePath of fileListings) {
            const sha1 = await hash.calculateFileSha1(filePath);
            log.info(`Calculated hash ${sha1} for ${filePath}, searching dat file for matches`)
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
            allBinFiles.map(filePath => this.storage.size(filePath))
        );
        const combinedBinSize = allBinSizes.reduce(
            (total, size) => total + size,
            0
        );

        const sizeMatches: Game[] = [];
        for (const game of this.dat.games) {
            const gameBinSize = game.roms
                .filter(rom => rom.name.endsWith('.bin'))
                .reduce((total, rom) => total + rom.size, 0);

            if (gameBinSize === combinedBinSize) {
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

        return {
            status: 'none',
            message: 'No match found in DAT file',
            game: undefined,
        };
    }

    async start(): Promise<{
        status: 'match' | 'partial' | 'none';
        message: string;
        game: Game | undefined;
    }> {
        return await this._work(this.sourceFile);
    }
}

export class RenameRunnerDirectory implements IRunner<string[]> {
    constructor(
        private readonly sourceDir: string,
        private readonly dat: Dat,
        private readonly cuesheetEntries: CuesheetEntry[],
        private readonly force: boolean
    ) {
        this.sourceDir = sourceDir;
        this.dat = dat;
        this.cuesheetEntries = cuesheetEntries;
        this.force = force;
    }

    async start(): Promise<string[]> {
        const outputFiles: string[] = [];
        const files = await storage().list(this.sourceDir, {
            avoidHiddenFiles: true,
            recursive: true,
        });
        log.info(`Found ${files.length} files in source directory`);

        for (const file of files.filter(fileName => fileName.endsWith('.chd'))) {
            /* Check if metadata.json already exists for this file */
            const baseFileName = path.basename(file, path.extname(file));
            const metadataFileName = `${baseFileName}.metadata.json`;
            const metadataFilePath = path.join(
                this.sourceDir,
                metadataFileName
            );

            const metadataExists = await storage().exists(metadataFilePath);
            if (metadataExists && !this.force) {
                log.info(
                    `Skipping ${file} - metadata.json already exists (use --force to re-rename)`
                );
                continue;
            }

            const runner = new RenameRunnerFile(
                file,
                this.dat,
                this.cuesheetEntries
            );
            if (runner instanceof Error) {
                log.error(
                    `Error creating rename runner for ${file}: ${runner.message}`
                );
                continue;
            }

            const result = await runner.start();
            log.info(
                `Rename result for ${file}: ${result.status} - ${result.message}`
            );

            let finalFileName = path.basename(file);

            /* Rename file if we have a game match */
            if (result.game && result.status !== 'none') {
                const gameName = result.game.name;
                const fileExtension = path.extname(file);
                const newFileName = `${gameName}${fileExtension}`;
                const newFilePath = path.join(this.sourceDir, newFileName);

                await storage().move(file, newFilePath);
                log.info(`Renamed ${finalFileName} to ${newFileName}`);
                finalFileName = newFileName;
            }

            outputFiles.push(file);
        }

        return outputFiles;
    }
}
