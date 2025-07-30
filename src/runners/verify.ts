import { log } from "../utils/logger";
import chd from "../utils/chd"
import { RarArchive } from "../archive/rar"
import { ZipArchive } from "../archive/zip"
import { EcmArchive } from "../archive/ecm";
import { SevenZipArchive } from "../archive/seven-zip"
import { guard, guardNotFalsy, guardValidString } from "../utils/guard";
import storage from "../utils/storage";
import { loadCuesheetFromFile } from "../utils/cuesheetLoader";
import path from "path";
import { Dat, Game, ROM } from "../utils/dat";
import { CuesheetEntry } from "../utils/cuesheetLoader";

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


const _findMatchingRom = (dat: Dat, fileName: string): { game: Game, rom: ROM } | undefined => {
    for (const game of dat.games) {
        const matchingRom = game.roms.find((rom) => rom.name === fileName);
        if (matchingRom) {
            return { game, rom: matchingRom };
        }
    }
    return undefined;
}

const _verifyFile = async (filePath: string, dat: Dat): Promise<Game | undefined> => {
    const fileName = path.basename(filePath);
    const matchingRom = _findMatchingRom(dat, fileName);
    
    if (!matchingRom) {
        log.warn(`No matching ROM found for ${fileName}`);
        return undefined;
    }

    /* Verify file size */
    const fileSize = await storage().size(filePath);
    if (fileSize !== matchingRom.rom.size) {
        log.warn(`File size mismatch for ${fileName}: expected ${matchingRom.rom.size}, got ${fileSize}`);
        return undefined;
    }

    /* Note: CRC verification is not implemented yet - would need CRC32 utility function */
    if (matchingRom.rom.crc) {
        log.info(`CRC verification skipped for ${fileName} - not implemented`);
    }

    log.info(`File ${fileName} verified successfully`);
    return matchingRom.game;
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

        const verifyResults = await Promise.all(fileListings.map((filePath) => _verifyFile(filePath, this.dat)));
        const matchResults = verifyResults.filter((result) => result !== undefined);

        if ( matchResults.length > 0) {
            return {
                status: matchResults.length === 1 ? 'match' : 'partial',
                message: `Found matching game for ${compressedFilePath}`,
                game: matchResults[0],
            };
        }

        /* Attempt to find match by combined bin size */
        const allBinFiles = fileListings.filter((filePath) => filePath.endsWith('.bin'));
        const allBinSizes = await Promise.all(allBinFiles.map((filePath) => storage().size(filePath)));
        const combinedBinSize = allBinSizes.reduce((acc, size) => acc + size, 0);

        const sizeMatches: Game[] = [];

        /* Attempt to find match by combined bin size */
        for ( const game of this.dat.games) {
            const romSize = game.roms.reduce((acc, rom) => acc + rom.size, 0);
            if ( romSize === combinedBinSize) {
                sizeMatches.push(game);
            }
        }

        if ( sizeMatches.length > 0) {
            return {
                status: sizeMatches.length === 1 ? 'match' : 'partial',
                message: `Found matching game for ${compressedFilePath}`,
                game: sizeMatches[0]
            };
        }

        let closestMatch: Game | undefined = undefined;
        let closestMatchSizeDiff = Number.MAX_SAFE_INTEGER;
        for ( const game of this.dat.games) {
            const romSize = game.roms.reduce((acc, rom) => acc + rom.size, 0);
            const sizeDiff = Math.abs(romSize - combinedBinSize);
            if ( sizeDiff < closestMatchSizeDiff || closestMatch === undefined) {
                closestMatch = game;
                closestMatchSizeDiff = sizeDiff;
            }
        }

        return {
            status: closestMatch ? 'partial' : 'none',
            message: `No matching game found for ${compressedFilePath}, bytes-delta: ${closestMatchSizeDiff}, percent-delta: ${(1-(closestMatchSizeDiff / combinedBinSize)) * 100}%`,
            game: closestMatch
        };
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