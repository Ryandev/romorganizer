import path from 'node:path';
import { log } from './logger';
import storage from './storage';

/**
 * Moves contents from subdirectories to the parent directory
 * This is commonly used when extracting archives that create an extra subdirectory level
 * @param outputDir - The output directory to process
 * @param filePath - The original file path for logging purposes
 */
export async function moveContentsFromSubdirectories(
    outputDir: string,
    filePath: string
): Promise<void> {
    const storageInstance = await storage();

    const allItems = await storageInstance.list(outputDir, {
        recursive: false,
    });
    const itemsWithChecks = await Promise.all(
        allItems.map(async (item: string) => ({
            path: item,
            name: item.split('/').pop() || item,
            isFile: await storageInstance.isFile(item),
            isDirectory: await storageInstance.isDirectory(item),
        }))
    );

    const files = itemsWithChecks.filter(
        (item: {
            path: string;
            name: string;
            isFile: boolean;
            isDirectory: boolean;
        }) => item.isFile && !item.name.startsWith('.')
    );
    const dirs = itemsWithChecks.filter(
        (item: {
            path: string;
            name: string;
            isFile: boolean;
            isDirectory: boolean;
        }) => item.isDirectory && !item.name.startsWith('.')
    );

    log.info(`File count: ${files.length}, Dir count: ${dirs.length}`);

    if (files.length === 0 && dirs.length > 0) {
        for (const dir of dirs) {
            const subItems = await storageInstance.list(dir.path, {
                recursive: false,
            });
            const subItemsWithChecks = await Promise.all(
                subItems.map(async (item: string) => ({
                    path: item,
                    name: item.split('/').pop() || item,
                    isFile: await storageInstance.isFile(item),
                    isDirectory: await storageInstance.isDirectory(item),
                }))
            );

            for (const subItem of subItemsWithChecks) {
                if (subItem.name !== '.') {
                    const destPath = path.join(outputDir, subItem.name);
                    await storageInstance.copy(subItem.path, destPath);
                    await storageInstance.remove(subItem.path);
                }
            }
        }
    }

    const extractedFiles = itemsWithChecks
        .filter(
            (item: {
                path: string;
                name: string;
                isFile: boolean;
                isDirectory: boolean;
            }) => item.isFile && !item.name.startsWith('.')
        )
        .map(
            (item: {
                path: string;
                name: string;
                isFile: boolean;
                isDirectory: boolean;
            }) => item.name
        );
    log.info(
        `Extracted ${filePath} to ${outputDir}, files ${extractedFiles.join(
            ', '
        )}`
    );
} 