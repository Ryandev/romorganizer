import path from 'node:path';
import { createRarArchive } from './rar';
import { createSevenZipArchive } from './seven-zip';
import { createZipArchive } from './zip';
import { createEcmArchive } from './ecm';
import { Archive } from './interface';

export function createArchive(archiveFile: string): Archive {
    const fileExtension = path.extname(archiveFile).toLowerCase().slice(1);
    switch (fileExtension) {
        case '7z': {
            return createSevenZipArchive(archiveFile);
        }
        case 'rar': {
            return createRarArchive(archiveFile);
        }
        case 'zip': {
            return createZipArchive(archiveFile);
        }
        case 'ecm': {
            return createEcmArchive(archiveFile);
        }
        default: {
            throw new Error(`Unsupported file extension: ${fileExtension}`);
        }
    }
}
