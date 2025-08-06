import storage from '../utils/storage';
import path from 'node:path';

/* Group files by basename with different extensions, Each group is a list of files with the same basename */
export async function groupedFiles(sourceDir: string): Promise<string[][]> {
    const files = await storage().list(sourceDir, {
        recursive: true,
        avoidHiddenFiles: true,
    });
    const groups: Record<string, string[]> = {};
    for (const file of files) {
        const basename = path.basename(file, path.extname(file));
        if (!groups[basename]) {
            groups[basename] = [];
        }
        groups[basename].push(file);
    }
    return Object.values(groups);
}

export function fileExtension(filePath: string): string {
    return filePath.split('.').pop() ?? '';
}
