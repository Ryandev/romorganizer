import { extname } from 'path';
import { Archive } from './base';
// import { EcmArchive } from './ecm';
import { RarArchive } from './rar';
import { SevenZipArchive } from './seven-zip';
import { ZipArchive } from './zip';

export type { Archive } from './base';
export { BaseArchive } from './base';
export { SevenZipArchive } from './seven-zip';
export { RarArchive } from './rar';
export { ZipArchive } from './zip';
// export { EcmArchive } from './ecm';

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
            throw new Error('ECM support is not available in the built version. Use the development version for ECM functionality.');
        default:
            abort(`Unsupported file extension: ${fileExtension}`);
    }
}
