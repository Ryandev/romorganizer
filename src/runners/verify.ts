
import chd from "../utils/chd"
import { guardValidString } from "../utils/guard";
import storage from "../utils/storage";
import path from "path";
import { Dat, Game } from "../utils/dat";
import { CuesheetEntry } from "../utils/cuesheetLoader";
import hash from "../utils/hash";

export interface IRunner {
    start(): Promise<{
        status: 'match' | 'partial' | 'none',
        message: string,
        game: Game | undefined
    }>;
}

const _fileExtension = (filePath: string): string => {
    return filePath.split('.').pop() ?? '';
}

export class Runner implements IRunner {
    private readonly temporaryFiles: string[] = [];
    constructor(
        private readonly sourceFile: string,
        private readonly dat: Dat,
        private readonly cuesheetEntries: CuesheetEntry[]
    ) {
        this.sourceFile = sourceFile;
        this.dat = dat;
        this.cuesheetEntries = cuesheetEntries;
    }

    /* Cleanup the temporary files when the runner is disposed */
    async [Symbol.dispose]() {
        await this._cleanup();
    }

    private async _cleanup(): Promise<void> {
        for (const file of this.temporaryFiles) {
            await storage().remove(file).catch(() => {
                /* ignore errors */
            });
        }
    }

    private async _work(compressedFilePath: string): Promise<{
        status: 'match' | 'partial' | 'none',
        message: string,
        game: Game | undefined
    }> {
        const filePathCue = await chd.extract({ chdFilePath: compressedFilePath, format: 'cue' });
        const outputDirectory = path.dirname(filePathCue);
        const fileListings = await storage().list(outputDirectory);

        /* Attempt to search dat file for all fileListings by sha1 */
        const matchingGames: Game[] = [];
        for ( const filePath of fileListings) {
            const sha1 = await hash.calculateFileSha1(filePath);
            const matchingGame = this.dat.games.find((game) => game.roms.some((rom) => rom.sha1hex === sha1));
            if (matchingGame && !matchingGames.includes(matchingGame)) {
                matchingGames.push(matchingGame);
            }
        }

        if ( matchingGames.length > 0) {
            return {
                status: matchingGames.length === 1 ? 'match' : 'partial',
                message: `Match via sha1 hash`,
                game: matchingGames[0]
            };
        }

        /* Attempt to find match by combined bin size */
        const allBinFiles = fileListings.filter((filePath) => filePath.endsWith('.bin'));
        const allBinSizes = await Promise.all(allBinFiles.map((filePath) => storage().size(filePath)));
        const combinedBinSize = allBinSizes.reduce((acc, size) => acc + size, 0);

        const sizeMatches: Game[] = [];

        /* Attempt to find match by combined bin size */
        for ( const game of this.dat.games) {
            const roms = game.roms.filter(rom => rom.name.endsWith('.bin'));
            const romSize = roms.reduce((acc, rom) => acc + rom.size, 0);
            if ( romSize === combinedBinSize) {
                sizeMatches.push(game);
            }
        }

        if ( sizeMatches.length > 0) {
            return {
                status: sizeMatches.length === 1 ? 'match' : 'partial',
                message: `Match via combined bin size`,
                game: sizeMatches[0]
            };
        }

        let closestMatch: Game | undefined = undefined;
        let closestMatchSizeDiff = Number.MAX_SAFE_INTEGER;

        for ( const game of this.dat.games) {
            const roms = game.roms.filter(rom => rom.name.endsWith('.bin'));
            const romSize = roms.reduce((acc, rom) => acc + rom.size, 0);
            const sizeDiff = Math.abs(romSize - combinedBinSize);
            if ( sizeDiff < closestMatchSizeDiff || closestMatch === undefined) {
                closestMatch = game;
                closestMatchSizeDiff = sizeDiff;
            }
        }

        return (closestMatchSizeDiff < 1000) ?{
            status: 'partial',
            message: `No matching game found for ${compressedFilePath}, bytes-delta: ${closestMatchSizeDiff}, percent-delta: ${(1-(closestMatchSizeDiff / combinedBinSize)) * 100}%`,
            game: closestMatch
        } : {
            status: 'none',
            message: `No match found`,
            game: undefined
        }
    }

    async start(): Promise<{
        status: 'match' | 'partial' | 'none',
        message: string,
        game: Game | undefined
    }> {
        try {            
            const result = await this._work(this.sourceFile);
            guardValidString(result);
            return result;
        } finally {
            await this._cleanup();
        }
    }
}

export default function createVerifyRunner(sourceFile: string, dat: Dat, cuesheetEntries: CuesheetEntry[]): IRunner | Error {
    const fileExtension = _fileExtension(sourceFile);
    if ( fileExtension !== 'chd') {
        return new Error(`Unsupported file extension: ${fileExtension}`);
    }
    return new Runner(sourceFile, dat, cuesheetEntries);
} 