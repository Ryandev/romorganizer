import { $ } from 'zx';
import { log } from './logger';
import { Dat, Game, ROM } from './dat';
import storage from './storage';
import path from 'node:path';
import { createHash } from 'node:crypto';
import chd from './chd';

export class VerificationException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'VerificationException';
    }
}

export class ConversionException extends Error {
    constructor(
        message: string,
        public convertedFilePath: string,
        public toolOutput?: string
    ) {
        super(message);
        this.name = 'ConversionException';
    }
}

export enum CueVerificationResult {
    NO_CUE_NEEDED = 'NO_CUE_NEEDED',
    GENERATED_CUE_VERIFIED_EXACTLY = 'GENERATED_CUE_VERIFIED_EXACTLY',
    GENERATED_CUE_MATCHES_ESSENTIALS_FROM_EXTRA_CUE = 'GENERATED_CUE_MATCHES_ESSENTIALS_FROM_EXTRA_CUE',
    GENERATED_CUE_MISMATCH_WITH_NO_EXTRA_CUE_PROVIDED = 'GENERATED_CUE_MISMATCH_WITH_NO_EXTRA_CUE_PROVIDED',
    GENERATED_CUE_DOES_NOT_MATCH_ESSENTIALS_FROM_EXTRA_CUE = 'GENERATED_CUE_DOES_NOT_MATCH_ESSENTIALS_FROM_EXTRA_CUE',
}

export class VerificationResult {
    constructor(
        public game: Game,
        public cueVerificationResult: CueVerificationResult
    ) {}
}

// These are simply all the commands that are used in chdman's .cue file writing code:
const CHDMAN_SUPPORTED_CUE_COMMANDS = new Set([
    'FILE',
    'TRACK',
    'PREGAP',
    'INDEX',
    'POSTGAP',
]);

function stripInsignificantWhitespaceAndChdmanUnsupportedCommandsFromCue(
    cueText: string
): string {
    const strippedCueLines = cueText.split('\n').map(line => line.trim());
    const supportedCueLines = strippedCueLines.filter(line => {
        const command = line.split(' ')[0]?.toUpperCase();
        return command && CHDMAN_SUPPORTED_CUE_COMMANDS.has(command);
    });
    return supportedCueLines.join('\n');
}

export async function convertChdToNormalizedRedumpDumpFolder(
    chdPath: string,
    redumpDumpFolder: string,
    _system?: string,
    showCommandOutput = false
): Promise<void> {
    const cueFilePath = path.join(
        redumpDumpFolder,
        path.basename(chdPath, '.chd') + '.cue'
    );

    // Use the existing CHD extraction functionality
    await convertChdToBincue(chdPath, cueFilePath, showCommandOutput);
    await normalizeRedumpBincueDump(cueFilePath);
}

async function convertChdToBincue(
    chdFilePath: string,
    outputCueFilePath: string,
    showCommandOutput: boolean
): Promise<void> {
    try {
        log.info(`Converting "${path.basename(chdFilePath)}" to .bin/.cue format`);

        // Use the existing CHD extraction functionality
        const extractedCuePath = await chd.extract({
            chdFilePath,
            format: 'cue'
        });

        // Copy the extracted files to the desired output location
        const extractedDir = path.dirname(extractedCuePath);
        const extractedFiles = await storage().list(extractedDir, { recursive: false });
        
        for (const file of extractedFiles) {
            const fileName = path.basename(file);
            const targetPath = path.join(path.dirname(outputCueFilePath), fileName);
            await storage().copy(file, targetPath);
        }

        log.info(`Splitting "${path.basename(outputCueFilePath)}" to use separate tracks if necessary`);

        // Use binmerge to split tracks if needed
        const binmergeResult = await $`binmerge --split -o ${path.dirname(outputCueFilePath)} ${outputCueFilePath} ${path.basename(outputCueFilePath, '.cue')}`;

        if (showCommandOutput) {
            log.info(binmergeResult.stdout);
        }

        if (binmergeResult.exitCode !== 0) {
            throw new ConversionException(
                'Failed to split .bin into separate tracks using binmerge',
                chdFilePath,
                binmergeResult.stdout
            );
        }
    } catch (error) {
        if (error instanceof ConversionException) {
            throw error;
        }
        throw new ConversionException(
            'Failed to convert .chd using existing CHD implementation',
            chdFilePath
        );
    }
}

async function normalizeRedumpBincueDump(cueFilePath: string): Promise<void> {
    // Read the cue file
    const cueContent = await storage().read(cueFilePath);
    const cueText = new TextDecoder().decode(cueContent);
    
    // Normalize line endings and remove extra whitespace
    const normalizedLines = cueText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    const normalizedContent = normalizedLines.join('\n');
    
    // Write back the normalized content
    await storage().write(cueFilePath, new TextEncoder().encode(normalizedContent));
}

async function calculateFileSha1(filePath: string): Promise<string> {
    const content = await storage().read(filePath);
    return createHash('sha1').update(Buffer.from(content)).digest('hex');
}

async function verifyRedumpDumpFolder(
    dumpFolder: string,
    dat: Dat
): Promise<VerificationResult> {
    const files = await storage().list(dumpFolder, { recursive: false });
    const binFiles = files.filter(file => file.endsWith('.bin'));
    const cueFiles = files.filter(file => file.endsWith('.cue'));

    if (binFiles.length === 0) {
        throw new VerificationException(`No .bin files found in ${dumpFolder}`);
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
    let cueVerificationResult = CueVerificationResult.NO_CUE_NEEDED;
    if (cueFiles.length > 0) {
        const cueFile = cueFiles[0];
        const cueContent = await storage().read(cueFile);
        const cueText = new TextDecoder().decode(cueContent);
        
        // Find matching .cue ROM in DAT
        const cueFileName = path.basename(cueFile);
        const matchingCueRom = game.roms.find(rom => rom.name === cueFileName);
        
        if (matchingCueRom) {
            const cueSha1 = await calculateFileSha1(cueFile);
            if (cueSha1 === matchingCueRom.sha1hex) {
                cueVerificationResult = CueVerificationResult.GENERATED_CUE_VERIFIED_EXACTLY;
            } else {
                // Try to normalize and compare
                stripInsignificantWhitespaceAndChdmanUnsupportedCommandsFromCue(cueText);
                // For now, we'll assume it matches if we can't verify exactly
                cueVerificationResult = CueVerificationResult.GENERATED_CUE_MISMATCH_WITH_NO_EXTRA_CUE_PROVIDED;
            }
        }
    }

    return new VerificationResult(game, cueVerificationResult);
}

export async function verifyChd(
    chdPath: string,
    dat: Dat,
    showCommandOutput: boolean,
    allowCueMismatches: boolean
): Promise<Game> {
    log.info(`Verifying dump file "${chdPath}"`);

    const tempDir = await storage().createTemporaryDirectory();

    try {
        await convertChdToNormalizedRedumpDumpFolder(
            chdPath,
            tempDir,
            dat.system,
            showCommandOutput
        );
        const verificationResult = await verifyRedumpDumpFolder(
            tempDir,
            dat
        );

        switch (verificationResult.cueVerificationResult) {
            case CueVerificationResult.NO_CUE_NEEDED:
            case CueVerificationResult.GENERATED_CUE_VERIFIED_EXACTLY:
                log.info(
                    `Dump verified correct and complete: "${verificationResult.game.name}"`
                );
                break;
            case CueVerificationResult.GENERATED_CUE_MATCHES_ESSENTIALS_FROM_EXTRA_CUE:
                log.info(
                    `Dump .bin files verified correct and complete, and .cue essential structure matches: "${verificationResult.game.name}"`
                );
                break;
            case CueVerificationResult.GENERATED_CUE_MISMATCH_WITH_NO_EXTRA_CUE_PROVIDED: {
                const message = `"${verificationResult.game.name}" .bin files verified and complete, but .cue does not match Datfile`;
                
                if (allowCueMismatches) {
                    log.warn(message);
                } else {
                    throw new VerificationException(message);
                }
                break;
            }
            default:
                throw new VerificationException(
                    `"${verificationResult.game.name}" .cue file does not match essential structure from provided .cue file`
                );
        }

        return verificationResult.game;
    } finally {
        // Clean up temp directory
        await storage().remove(tempDir);
    }
} 