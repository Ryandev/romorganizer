import { $ } from 'zx';
import { log } from './logger';
import { guardFileExists, guardCommandExists, guardDirectoryExists } from './guard';
import storage from './storage';
import path from 'node:path';
import { withTimeout } from './promise';

const CHD_FORMATS = ['cue', 'gdi', 'iso', 'img'] as const;
type ChdFormat = (typeof CHD_FORMATS)[number];

export interface ChdManager {
    create(options: { inputFilePath: string }): Promise<string>;
    extract(options: {
        chdFilePath: string;
        format: ChdFormat;
        outputDirectory?: string;
    }): Promise<string>;
    verify(options: { chdFilePath: string }): Promise<void>;
}

async function createChdFile(options: {
    inputFilePath: string;
}): Promise<string> {
    guardCommandExists('chdman');
    const { inputFilePath } = options;

    guardFileExists(
        inputFilePath,
        `Input file does not exist: ${inputFilePath}`
    );

    /* check input file path format */
    const inputFileType = path.extname(inputFilePath).slice(1).toLowerCase();
    if (!CHD_FORMATS.includes(inputFileType as ChdFormat)) {
        throw new Error(
            `Input file extension does not match format: ${inputFileType} !== ${CHD_FORMATS.join(', ')}`
        );
    }

    const temporaryDirectory = await storage().createTemporaryDirectory();
    guardDirectoryExists(temporaryDirectory, `Temporary directory does not exist: ${temporaryDirectory}`);

    const outputFileName =
        path.basename(inputFilePath, path.extname(inputFilePath)) + '.chd';

    const outputFilePath = path.join(temporaryDirectory, outputFileName);

    switch (inputFileType) {
        case 'cue':
        case 'gdi':
        case 'img':
        case 'iso': {
            await withTimeout($`chdman createcd --force --input ${inputFilePath} --output ${outputFilePath}`);
            break;
        }
        default: {
            throw new Error(`No command found for ${inputFileType}`);
        }
    }

    guardFileExists(
        outputFilePath,
        `CHD file does not exist: ${outputFilePath}`
    );

    log.info(`Successfully created ${outputFilePath}`);

    return outputFilePath;
}

async function extractChdFile(options: {
    chdFilePath: string;
    format: ChdFormat;
    outputDirectory?: string;
}): Promise<string> {
    guardCommandExists('chdman');

    const { chdFilePath, format } = options;
    guardFileExists(chdFilePath, `CHD file does not exist: ${chdFilePath}`);
    const outputDirectory =
        options.outputDirectory ?? (await storage().createTemporaryDirectory());

    const outputFileName =
        path.basename(chdFilePath, '.chd') + `.${options.format}`;
    const outputFilePath = path.join(outputDirectory, outputFileName);

    switch (format) {
        case 'cue':
        case 'gdi':
        case 'iso': {
            await withTimeout($`chdman extractcd --force --input ${chdFilePath} --output ${outputFilePath}`);
            break;
        }
        case 'img': {
            await withTimeout($`chdman extractraw --force --input ${chdFilePath} --output ${outputFilePath}`);
            break;
        }
        default: {
            throw new Error(`No command found for ${format}`);
        }
    }

    guardFileExists(
        outputFilePath,
        `Cue file does not exist: ${outputFilePath}`
    );
    log.info(`Successfully extracted ${chdFilePath} to ${outputFilePath}`);

    return outputFilePath;
}

async function verifyChdFile(options: { chdFilePath: string }): Promise<void> {
    guardCommandExists('chdman');

    const { chdFilePath } = options;
    guardFileExists(chdFilePath, `CHD file does not exist: ${chdFilePath}`);

    log.info(`Verifying ${chdFilePath}`);

            await $`chdman verify --input ${chdFilePath}`;

    log.info(`Successfully verified ${chdFilePath}`);
}

export default {
    canCreateChdFile: (filePath: string) => {
        const fileExtension = path.extname(filePath).slice(1);
        return CHD_FORMATS.includes(fileExtension as ChdFormat);
    },
    create: createChdFile,
    extract: extractChdFile,
    verify: verifyChdFile,
} as ChdManager;
