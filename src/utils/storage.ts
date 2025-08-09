import {
    access,
    constants,
    copyFile,
    lstat,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import { readdir as readDirectoryAsync } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { IStorage } from './storage.interface';
import { log } from './logger';
import { getTemporaryDirectory } from './environment.js';

type FilePath = string;

export enum FileMode {
    Read = 0,
    Write = 1,
}

const DEFAULT_ARGS = {
    recursive: true,
    removePrefix: false,
    includeDirectories: false,
} as const;

function _logException(error: unknown) {
    log.error(`Storage error: ${error}`);
}

async function _write(
    filePath: FilePath,
    contents: ArrayBuffer
): Promise<void> {
    try {
        const buffer = Buffer.from(contents);
        await writeFile(filePath, buffer);
    } catch (error) {
        _logException(error);
        throw error;
    }
}

async function _read(filePath: FilePath): Promise<ArrayBuffer> {
    try {
        const buffer = await readFile(filePath);
        return buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
        );
    } catch (error) {
        _logException(error);
        throw error;
    }
}

async function _exists(filePath: FilePath): Promise<boolean> {
    try {
        await access(filePath, constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

async function _isDirectory(filePath: FilePath): Promise<boolean> {
    const exists = await _exists(filePath);
    if (!exists) {
        return false;
    }

    const stats = await lstat(filePath).catch(() => {
        /* Ignore */
    });

    return stats?.isDirectory() ?? false;
}

async function _isFile(filePath: FilePath): Promise<boolean> {
    const exists = await _exists(filePath);
    if (!exists) {
        return false;
    }

    const stats = await lstat(filePath);
    return stats.isFile();
}

async function _listDirectory(
    filePath: FilePath | undefined,
    options:
        | {
              recursive: boolean;
              removePrefix: boolean;
              avoidHiddenFiles: boolean;
              includeDirectories: boolean;
          }
        | undefined
): Promise<FilePath[]> {
    if (filePath === undefined) return [];
    const files = await readDirectoryAsync(filePath);
    /* https://github.com/microsoft/TypeScript/issues/7294 */
    const fsListings = files.filter(item => typeof item === 'string');

    /* Filter out hidden files if avoidHiddenFiles is true */
    const filteredListings = options?.avoidHiddenFiles
        ? fsListings.filter(item => !item.startsWith('.'))
        : fsListings;

    const items: FilePath[] = [];

    for (const listingFileName of filteredListings) {
        const listingPath = path.join(filePath, listingFileName);
        const isDirectory = await _isDirectory(listingPath);
        if (isDirectory) {
            if (options?.includeDirectories ?? true) {
                items.push(listingPath);
            }
            /* Listings recursive calls to #_listDirectory */
            if (options?.recursive ?? false) {
                const recursiveListings = await _listDirectory(listingPath, {
                    recursive: options?.recursive ?? false,
                    removePrefix: false,
                    avoidHiddenFiles: options?.avoidHiddenFiles ?? false,
                    includeDirectories: options?.includeDirectories ?? false,
                });
                items.push(...recursiveListings);
            }
        } else {
            items.push(listingPath);
        }
    }

    const returnItems = items
        /* Make sure to remove the #filePath prefix from this dir,
         * this ensures we have a path although only a relative path from the chroot
         */
        .map(outputFilePath =>
            (options?.removePrefix ?? false)
                ? path.relative(filePath, outputFilePath)
                : outputFilePath
        );

    return returnItems;
}

async function _createDirectory(directoryPath: FilePath): Promise<void> {
    if (directoryPath.length <= 1) {
        return;
    }

    try {
        await mkdir(directoryPath, { recursive: true });
    } catch (error) {
        _logException(error);
        throw error;
    }
}

async function _remove(filePath: FilePath | FilePath[]): Promise<void> {
    const paths = Array.isArray(filePath) ? filePath : [filePath];
    try {
        await Promise.all(paths.map(path => rm(path, { recursive: true })));
    } catch (error) {
        _logException(error);
        throw error;
    }
}

async function _size(filePath: string): Promise<number> {
    try {
        const stats = await lstat(filePath);
        return stats.size;
    } catch (error) {
        _logException(error);
        throw error;
    }
}

async function _copyFile(
    sourceFile: FilePath,
    destinationFile: FilePath
): Promise<void> {
    try {
        await copyFile(sourceFile, destinationFile);
    } catch (error) {
        _logException(error);
        throw error;
    }
}

async function _move(source: FilePath, destination: FilePath): Promise<void> {
    if (source === destination) {
        /* Nothing to do */
        return;
    }

    const exists = await _exists(source);

    if (!exists) {
        throw new Error(`Source path does not exist: ${source}`);
    }

    /* if the source is a file & the destination is a directory, rename destination to the basename of the source file in the destination directory */
    if ((await _isFile(source)) && (await _isDirectory(destination))) {
        destination = path.join(destination, path.basename(source));
    }

    /* Ensure destination directory exists */
    await _createDirectory(path.dirname(destination));

    /* Add Windows support for when source & destination are only different in casing.
       Windows is case-insensitive, so we need to ensure the destination is the same as the source. */
    const fileNameCaseChangeOnly = path.basename(source).toLowerCase() === path.basename(destination).toLowerCase();

    if (fileNameCaseChangeOnly) {
        log.info(`Moving ${source} to ${destination} (case change only)`);
        /* Windows case-insensitive filesystem workaround:
           1. Copy source to temp directory
           2. Remove original source file
           3. Copy from temp to final destination
           4. Clean up temp directory */
        const tempDir = await _createTemporaryDirectory('move-temp');
        const tempFile = path.join(tempDir, path.basename(source));
        
        try {
            await _copyFile(source, tempFile);
            
            await _remove(source).catch(() => {
                /* Ignore errors */
            });
            
            await _copyFile(tempFile, destination);
            
            await _remove(tempDir);
        } catch (error) {
            await _remove(tempDir).catch(() => {
                /* Ignore errors */
            });
            throw error;
        }
    } else {
        /* If we attempt to copy across partitions, we need to use the copy command otherwise we will get EXDEV: cross-device link not permitted error */
        /* Remove the destination file if it exists */
        await _remove(destination).catch(() => {
            /* Ignore */
        });
        await _copyFile(source, destination);
        await _remove(source);
    }

    /* Verify the move operation was successful */
    const destinationExists = await _exists(destination);
    if (!destinationExists) {
        throw new Error(`Move operation failed: destination file does not exist: ${destination}`);
    }
}

async function _copyRecursiveSync(
    source: FilePath,
    destination: FilePath
): Promise<void> {
    const exists = await _exists(source);
    const isDirectory = await _isDirectory(source);

    if (!exists) {
        /* Ignore */
    } else if (isDirectory) {
        await _createDirectory(destination);
        const listings = await _listDirectory(source, {
            recursive: false,
            removePrefix: false,
            avoidHiddenFiles: false,
            includeDirectories: false,
        });
        const copyTasks = listings.map(childItemName =>
            _copyRecursiveSync(
                path.join(source, childItemName),
                path.join(destination, childItemName)
            )
        );
        await Promise.all(copyTasks);
    } else {
        /* Is file */
        await _copyFile(source, destination);
    }
}

async function _createTemporaryDirectory(prefix: FilePath): Promise<FilePath> {
    try {
        const tempBase = getTemporaryDirectory() || tmpdir();
        return await mkdtemp(path.join(tempBase, prefix));
    } catch (error) {
        _logException(error);
        throw error;
    }
}

function storage(
    parameters: Partial<typeof DEFAULT_ARGS> = DEFAULT_ARGS
): Readonly<IStorage> {
    const storageController: IStorage = {
        identifier: 'local',
        write: (filePath: string, contents: ArrayBuffer) =>
            _write(filePath, contents),
        read: (filePath: string) => _read(filePath),
        list: async (
            filePath: string,
            options?: {
                removePrefix?: boolean;
                recursive?: boolean;
                avoidHiddenFiles?: boolean;
                includeDirectories?: boolean;
            }
        ) => {
            const results = await _listDirectory(filePath, {
                recursive: options?.recursive ?? parameters.recursive ?? false,
                removePrefix:
                    options?.removePrefix ?? parameters.removePrefix ?? false,
                avoidHiddenFiles: options?.avoidHiddenFiles ?? false,
                includeDirectories:
                    options?.includeDirectories ??
                    parameters.includeDirectories ??
                    false,
            });

            const operators: ((item: string) => string)[] = [];

            if (options?.removePrefix ?? DEFAULT_ARGS.removePrefix) {
                operators.push(item => path.relative(filePath, item));
            }

            const newItems = results.map(oldValue => {
                let newValue = oldValue;
                for (const operator of operators) {
                    newValue = operator(newValue);
                }
                return newValue;
            });

            return newItems;
        },
        exists: (filePath: string) => _exists(filePath),
        isFile: (filePath: string) => _isFile(filePath),
        isDirectory: (filePath: string) => _isDirectory(filePath),
        createDirectory: (directoryPath: string) =>
            _createDirectory(directoryPath),
        remove: (filePath: string) => _remove(filePath),
        copy: (sourcePath: string, destinationPath: string) =>
            _copyRecursiveSync(sourcePath, destinationPath),
        move: (sourcePath: string, destinationPath: string) =>
            _move(sourcePath, destinationPath),
        size: (filePath: string) => _size(filePath),
        createTemporaryDirectory: () => _createTemporaryDirectory('local-temp'),
        pathSeparator: () => path.sep,
    };

    return Object.freeze(storageController);
}

export default storage;
