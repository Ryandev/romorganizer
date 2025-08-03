import path from 'node:path';
import { Archive } from './base';
import { RarArchive } from './rar';
import { SevenZipArchive } from './seven-zip';
import { ZipArchive } from './zip';
import { EcmArchive } from './ecm';
export type { Archive } from './base';
export { BaseArchive } from './base';
export { SevenZipArchive } from './seven-zip';
export { RarArchive } from './rar';
export { ZipArchive } from './zip';
export { EcmArchive } from './ecm';

export function createArchive(archiveFile: string): Archive {
    const fileExtension = path.extname(archiveFile).toLowerCase().slice(1);
    switch (fileExtension) {
        case '7z': {
            return new SevenZipArchive(archiveFile);
        }
        case 'rar': {
            return new RarArchive(archiveFile);
        }
        case 'zip': {
            return new ZipArchive(archiveFile);
        }
        case 'ecm': {
            return new EcmArchive(archiveFile);
        }
        default: {
            throw new Error(`Unsupported file extension: ${fileExtension}`);
        }
    }
}
