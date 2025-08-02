import { log } from './logger';
import storage from './storage';
import { loadDat, Dat } from './dat';
import { ZipArchive } from '../archive/zip';
import path from 'node:path';

export class DatLoaderException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatLoaderException';
    }
}

/**
 * Loads a DAT file, handling both regular .dat files and zip files containing .dat files
 * @param datPath Path to the DAT file or zip file containing a DAT file
 * @returns Promise<Dat> The loaded DAT object
 */
export async function loadDatFromPath(datPath: string): Promise<Dat> {
    const fileExtension = path.extname(datPath).toLowerCase();

    /* If it's already a .dat file, load it directly */
    if (fileExtension === '.dat') {
        return await loadDat(datPath);
    }

    /* If it's a zip file, extract it and find the .dat file inside */
    if (fileExtension === '.zip') {
        return await loadDatFromZip(datPath);
    }

    throw new DatLoaderException(
        `Unsupported file type: ${fileExtension}. Only .dat and .zip files are supported.`
    );
}

/**
 * Extracts a zip file and finds the .dat file inside, then loads it
 * @param zipPath Path to the zip file
 * @returns Promise<Dat> The loaded DAT object
 */
async function loadDatFromZip(zipPath: string): Promise<Dat> {
    log.info(`Loading DAT from zip file: ${zipPath}`);

    /* Verify the zip file exists */
    if (!(await storage().exists(zipPath))) {
        throw new DatLoaderException(`Zip file does not exist: ${zipPath}`);
    }

    /* Create a temporary directory for extraction */
    const tempDir = await storage().createTemporaryDirectory();

    try {
        /* Extract the zip file */
        const zipArchive = new ZipArchive(zipPath);
        const extractedDir = await zipArchive.extract();

        /* Find all .dat files in the extracted directory */
        const allFiles = await storage().list(extractedDir, {
            recursive: true,
        });
        const datFiles = allFiles.filter(
            file => path.extname(file).toLowerCase() === '.dat'
        );

        if (datFiles.length === 0) {
            throw new DatLoaderException(
                `No .dat files found in zip: ${zipPath}`
            );
        }

        if (datFiles.length > 1) {
            log.warn(
                `Multiple .dat files found in zip: ${datFiles.join(', ')}`
            );
            log.warn(`Using the first one: ${datFiles[0]}`);
        }

        const datFile = datFiles[0];
        if (!datFile) {
            throw new DatLoaderException(
                `No .dat files found in zip: ${zipPath}`
            );
        }
        log.info(`Found DAT file in zip: ${datFile}`);

        /* Load the DAT file from the extracted location */
        const dat = await loadDat(datFile);

        log.info(
            `Successfully loaded DAT from zip: ${dat.system} with ${dat.games.length} games`
        );

        return dat;
    } catch (error) {
        /* Clean up the temporary directory */
        try {
            await storage().remove(tempDir);
        } catch (cleanupError) {
            log.warn(
                `Failed to clean up temporary directory ${tempDir}: ${cleanupError}`
            );
        }

        if (error instanceof DatLoaderException) {
            throw error;
        }

        throw new DatLoaderException(
            `Failed to load DAT from zip ${zipPath}: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Determines if a file path points to a zip file containing a DAT file
 * @param filePath Path to check
 * @returns Promise<boolean> True if it's a zip file that likely contains a DAT file
 */
export async function isZipWithDat(filePath: string): Promise<boolean> {
    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension !== '.zip') {
        return false;
    }

    if (!(await storage().exists(filePath))) {
        return false;
    }

    try {
        /* Try to extract and check for .dat files */
        const zipArchive = new ZipArchive(filePath);
        const extractedDir = await zipArchive.extract();

        const allFiles = await storage().list(extractedDir, {
            recursive: true,
        });
        const hasDatFiles = allFiles.some(
            file => path.extname(file).toLowerCase() === '.dat'
        );

        /* Clean up */
        await storage().remove(extractedDir);

        return hasDatFiles;
    } catch (error) {
        log.warn(
            `Failed to check zip contents: ${error instanceof Error ? error.message : String(error)}`
        );
        return false;
    }
}
