import { extname } from 'path';
import { Archive } from './base.js';
import { EcmArchive } from './ecm.js';
import { RarArchive } from './rar.js';
import { SevenZipArchive } from './seven-zip.js';
import { ZipArchive } from './zip.js';

export type { Archive } from './base.js';
export { BaseArchive } from './base.js';
export { SevenZipArchive } from './seven-zip.js';
export { RarArchive } from './rar.js';
export { ZipArchive } from './zip.js';
export { EcmArchive } from './ecm.js';

export function createArchive(archiveFile: string): Archive {
    const fileExtension = extname(archiveFile).toLowerCase().slice(1);
    switch (fileExtension) {
        case '7z':
            return new SevenZipArchive(archiveFile);
        case 'rar':
            return new RarArchive(archiveFile);
        case 'zip':
            return new ZipArchive(archiveFile);
        case 'ecm':
            return new EcmArchive(archiveFile);
        default:
            abort(`Unsupported file extension: ${fileExtension}`);
    }
}
