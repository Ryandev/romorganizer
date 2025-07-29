import fs from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import storage from './storage';
import { log } from './logger';
import { guardNotFalsy } from './guard';
import { calculateFileSha1 } from './hash';

export class DatParsingException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatParsingException';
    }
}

export class VerificationException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'VerificationException';
    }
}

export interface Dat {
    system: string;
    games: Game[];
    romsBySha1hex: Map<string, ROM[]>;
}

export interface Game {
    name: string;
    dat: Dat;
    roms: ROM[];
    description?: string;
    category?: string;
}

export interface ROM {
    name: string;
    size: number;
    sha1hex: string;
    game: Game;
    crc?: string;
    md5?: string;
}



function parseDatFile(xmlContent: string): Dat {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '_text',
        parseAttributeValue: false,
        parseTagValue: false,
        trimValues: true
    });

    const parsed = parser.parse(xmlContent);
    
    // Validate that we have a datafile structure
    if (!parsed.datafile) {
        throw new DatParsingException('Invalid DAT file: missing datafile root element');
    }

    const datafile = parsed.datafile;
    
    // Parse header
    if (!datafile.header || !datafile.header.name) {
        throw new DatParsingException('Invalid DAT file: missing header or header name');
    }

    const systemName = datafile.header.name._text || datafile.header.name;
    const dat: Dat = {
        system: systemName,
        games: [],
        romsBySha1hex: new Map<string, ROM[]>()
    };

    // Parse games
    if (datafile.game) {
        const games = Array.isArray(datafile.game) ? datafile.game : [datafile.game];
        
        for (const gameData of games) {
            if (!gameData['@_name']) {
                throw new DatParsingException('Game missing required name attribute');
            }

            const game: Game = {
                name: gameData['@_name'],
                dat,
                roms: [],
                ...(gameData.description && { description: gameData.description._text || gameData.description }),
                ...(gameData.category && { category: gameData.category._text || gameData.category })
            };
            dat.games.push(game);

            // Parse ROMs
            if (gameData.rom) {
                const roms = Array.isArray(gameData.rom) ? gameData.rom : [gameData.rom];
                
                for (const romData of roms) {
                    if (!romData['@_name'] || !romData['@_size'] || !romData['@_sha1']) {
                        throw new DatParsingException('ROM missing required attributes (name, size, or sha1)');
                    }

                    const size = Number.parseInt(romData['@_size'], 10);
                    if (Number.isNaN(size)) {
                        throw new DatParsingException(
                            `ROM has size attribute that is not an integer: ${romData['@_size']}`
                        );
                    }

                    const rom: ROM = {
                        name: romData['@_name'],
                        size,
                        sha1hex: romData['@_sha1'],
                        game,
                        ...(romData['@_crc'] && { crc: romData['@_crc'] }),
                        ...(romData['@_md5'] && { md5: romData['@_md5'] })
                    };

                    game.roms.push(rom);

                    // Add to SHA1 index
                    const romsWithSha1 = dat.romsBySha1hex.get(rom.sha1hex) || [];
                    romsWithSha1.push(rom);
                    dat.romsBySha1hex.set(rom.sha1hex, romsWithSha1);
                }
            }
        }
    }

    return dat;
}

export async function loadDat(datPath: string): Promise<Dat> {
    // Check file extension is .dat
    if (!datPath.endsWith('.dat')) {
        throw new DatParsingException(
            `Dat file must have a .dat extension: ${datPath}`
        );
    }

    log.info(`Loading Datfile "${datPath}"`);
    const xmlContent = await fs.readFile(datPath, 'utf8');
    
    return parseDatFile(xmlContent);
}


/**
 * Finds DAT candidates by matching combined track sizes
 * @param dat The DAT object
 * @param combinedBinSize The size of the combined BIN file
 * @returns Game[] Array of candidate games
 */
export function findGamesByCombinedBinSize(dat: Dat, combinedBinSize: number): { matches: Game[], status: 'match'|'closest'|'none' } {
    const result: { matches: Game[], status: 'match'|'closest'|'none' } = {
        matches: [],
        status: 'none'
    };
    
    for (const game of dat.games) {
        // Get all BIN ROMs for this game
        const binRoms = game.roms.filter(rom => rom.name.endsWith('.bin'));
        
        if (binRoms.length === 0) continue;
        
        // Calculate combined size of all BIN tracks
        const combinedSize = binRoms.reduce((sum, rom) => sum + rom.size, 0);
        
        // Check if combined size matches
        if (combinedSize === combinedBinSize) {
            result.matches.push(game);
            log.info(`Found candidate game "${game.name}" with combined size ${combinedSize} matching ${combinedBinSize}`);
            result.status = 'match';
            return result;
        }
    }

    if ( result.matches.length === 0 ) {
        /* find the closest match by size */
        let closestMatch: Game = dat.games[0] as Game;
        let closestMatchSize = 0;

        for ( const game of dat.games ) {
            const combinedSize = game.roms.reduce((sum, rom) => sum + rom.size, 0);
            if ( Math.abs(combinedSize - combinedBinSize) < Math.abs(closestMatchSize - combinedBinSize) ) {
                closestMatch = game;
                closestMatchSize = combinedSize;
            }
        }

        const sizeDelta = Math.abs(closestMatchSize - combinedBinSize);
        log.info(`Closest match "${closestMatch.name}" with size ${closestMatchSize} and size delta ${sizeDelta}`);

        result.matches = [closestMatch];
        result.status = 'closest';
    }
    
    return result;
}

export async function verifyBinCueAgainstDat(
    dat: Dat,
    cueFilePath: string,
    allowCueMismatches: boolean = true
): Promise<Game> {
    const cueDir = path.dirname(cueFilePath);
    const files = await storage().list(cueDir, { recursive: false });
    const binFiles = files.filter(file => file.endsWith('.bin'));
    const cueFiles = files.filter(file => file.endsWith('.cue'));

    if (binFiles.length === 0) {
        throw new VerificationException(`No .bin files found in ${cueDir}`);
    }

    // Verify each .bin file against the DAT
    const verifiedRoms: ROM[] = [];
    for (const binFile of binFiles) {
        const fileName = path.basename(binFile);
        const fileSize = await storage().size(binFile);
        const fileSha1 = await calculateFileSha1(binFile);

        // Find matching ROM in DAT
        const matchingRoms = dat.romsBySha1hex.get(fileSha1) || [];
        const matchingRom = matchingRoms.find(rom => 
            rom.name === fileName && rom.size === fileSize
        );

        if (!matchingRom) {
            throw new VerificationException(
                `No matching ROM found in DAT for ${fileName} (SHA1: ${fileSha1})`
            );
        }

        verifiedRoms.push(matchingRom);
    }

    // Find the game that contains all verified ROMs
    const game = verifiedRoms[0]?.game;
    if (!game) {
        throw new VerificationException('No game found for verified ROMs');
    }

    // Verify that all ROMs belong to the same game
    const allRomsBelongToSameGame = verifiedRoms.every(rom => rom.game === game);
    if (!allRomsBelongToSameGame) {
        throw new VerificationException('ROMs belong to different games');
    }

            // Verify .cue file if present
        if (cueFiles.length > 0) {
            const cueFile = cueFiles[0];
            guardNotFalsy(cueFile, 'No .cue file found');
            
            // Find matching .cue ROM in DAT
            const cueFileName = path.basename(cueFile);
            const matchingCueRom = game.roms.find(rom => rom.name === cueFileName);
        
        if (matchingCueRom) {
            const cueSha1 = await calculateFileSha1(cueFile);
            if (cueSha1 !== matchingCueRom.sha1hex) {
                const message = `"${game.name}" .bin files verified and complete, but .cue does not match Datfile`;
                
                if (!allowCueMismatches) {
                    throw new VerificationException(message);
                }
                // Log warning but continue
                log.warn(message);
            }
        }
    }

    return game;
}


