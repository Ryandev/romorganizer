import type { Stats } from 'node:fs';
import {
    access,
    close,
    constants,
    copyFile,
    fsync,
    lstat,
    mkdir,
    mkdtemp,
    open,
    readFile,
    rm,
    writeFile,
} from 'node:fs';
import { readdir as readDirectoryAsync } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { IStorage } from './storage.interface';
import { log } from './logger';
import { getTemporaryDirectory } from './environment.js';

type FilePath = string;
type FileDescriptor = number;

export enum FileMode {
    Read = 0,
    Write = 1,
}

const DEFAULT_ARGS = {
    recursive: true,
    removePrefix: false,
} as const;

function _logException(error: unknown) {
    log.error(`Storage error: ${error}`);
}

function _openFileDescriptor(
    filePath: string,
    openMode: FileMode[] = [FileMode.Read]
): Promise<FileDescriptor> {
    const modeMap: Record<FileMode, string> = {
        [FileMode.Read]: 'r',
        [FileMode.Write]: 'w',
    };

    return new Promise((resolve, reject) => {
        const flags = openMode.map(mode => modeMap[mode]).join('');
        open(filePath, flags, (error, fd) => {
            if (error) {
                _logException(error);
                reject(error);
            } else {
                resolve(fd);
            }
        });
    });
}

function _flushFileDescriptor(fd: FileDescriptor): Promise<void> {
    return new Promise((resolve, reject) => {
        fsync(fd, error => {
            if (error) {
                _logException(error);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function _closeFileDescriptor(fd: FileDescriptor): Promise<void> {
    return new Promise((resolve, reject) => {
        close(fd, error => {
            if (error) {
                _logException(error);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function _writeFile(
    file: FilePath | FileDescriptor,
    contents: ArrayBuffer
): Promise<void> {
    return new Promise((resolve, reject) => {
        const buffer = Buffer.from(contents);
        writeFile(file, buffer, error => {
            if (error) {
                _logException(error);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function _readFile(file: FilePath | FileDescriptor): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        readFile(file, (error, buffer) => {
            if (error) {
                _logException(error);
                reject(error);
            } else {
                resolve(
                    buffer.buffer.slice(
                        buffer.byteOffset,
                        buffer.byteOffset + buffer.byteLength
                    )
                );
            }
        });
    });
}

async function _write(
    filePath: FilePath,
    contents: ArrayBuffer
): Promise<void> {
    const fd = await _openFileDescriptor(filePath, [FileMode.Write]);

    const errors: Error[] = [];

    await _writeFile(fd, contents).catch((error: Error) => errors.push(error));
    await _flushFileDescriptor(fd).catch((error: Error) => errors.push(error));

    await _closeFileDescriptor(fd);

    const lastError = errors.at(-1);

    if (lastError) {
        _logException(lastError);
        throw lastError;
    }
}

async function _read(filePath: FilePath): Promise<ArrayBuffer> {
    const fd = await _openFileDescriptor(filePath, [FileMode.Read]);

    await _flushFileDescriptor(fd);

    const result = await _readFile(fd).catch((error: Error) => error);

    await _closeFileDescriptor(fd);

    if (result instanceof Error) {
        _logException(result);
        throw result;
    } else {
        return result;
    }
}

function _exists(filePath: FilePath): Promise<boolean> {
    return new Promise(resolve => {
        access(filePath, constants.R_OK, error => {
            if (error) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

function _pathStats(filePath: FilePath): Promise<Stats> {
    return new Promise((resolve, reject) => {
        lstat(filePath, (error, stats) => {
            if (error) {
                _logException(error);
                reject(error);
            } else {
                resolve(stats);
            }
        });
    });
}

function _isDirectory(filePath: FilePath): Promise<boolean> {
    return new Promise((resolve, reject) => {
        _exists(filePath)
            .then(async exists => {
                const defaultStats: Partial<Stats> = {
                    isDirectory: () => false,
                };

                if (!exists) {
                    return defaultStats;
                }

                const stats = await _pathStats(filePath).catch(() => {
                    /* Ignore */
                });

                return stats ?? defaultStats;
            })
            .then(stats => {
                const { isDirectory } = stats;
                const result =
                    isDirectory === undefined ? false : isDirectory.call(stats);
                resolve(result);
            })
            .catch((error: Error) => {
                reject(error);
            });
    });
}

function _isFile(filePath: FilePath): Promise<boolean> {
    return new Promise((resolve, reject) => {
        _exists(filePath)
            .then(exists => {
                if (exists) {
                    return _pathStats(filePath);
                }

                const noDirectoryStats: Partial<Stats> = {
                    isDirectory: () => false,
                };

                return noDirectoryStats;
            })
            .then(stats => {
                const { isFile } = stats;
                const result =
                    isFile === undefined ? false : isFile.call(stats);
                resolve(result);
            })
            .catch((error: Error) => {
                reject(error);
            });
    });
}

async function _listDirectory(
    filePath: FilePath | undefined,
    options:
        | {
              recursive: boolean;
              removePrefix: boolean;
              avoidHiddenFiles: boolean;
          }
        | undefined
): Promise<FilePath[]> {
    if (filePath === undefined) return [];
    const files = await readDirectoryAsync(filePath);
    /* https://github.com/microsoft/TypeScript/issues/7294 */
    const fsListings = files.filter(item => typeof item === 'string');

    // Filter out hidden files if avoidHiddenFiles is true
    const filteredListings = options?.avoidHiddenFiles 
        ? fsListings.filter(item => !item.startsWith('.'))
        : fsListings;

    const nestedListings: string[][] = [];

    if (options?.recursive ?? false) {
        const entryPaths = filteredListings.map(item => path.join(filePath, item));
        const isDirectories = await Promise.all(
            entryPaths.map(entry => _isDirectory(entry))
        );
        const recursiveListings = await Promise.all(
            isDirectories.map((isDirectory, index) =>
                isDirectory
                    ? _listDirectory(entryPaths[index], {
                          recursive: options?.recursive ?? false,
                          removePrefix: false,
                          avoidHiddenFiles: options?.avoidHiddenFiles ?? false,
                      })
                    : Promise.resolve([])
            )
        );

        nestedListings.push(...recursiveListings);
    }

    const items: FilePath[] = [
        /* Listings from #fs.readdir */
        ...filteredListings.map((item: string) => path.join(filePath, item)),

        /* Listings recursive calls to #_listDirectory */
        ...nestedListings.flat(1),
    ]
        /* Make sure to remove the #filePath prefix from this dir,
         * this ensures we have a path although only a relative path from the chroot
         */
        .map(outputFilePath =>
            (options?.removePrefix ?? false)
                ? path.relative(filePath, outputFilePath)
                : outputFilePath
        );

    return items;
}

function _createDirectory(directoryPath: FilePath): Promise<void> {
    if (directoryPath.length <= 1) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        mkdir(directoryPath, { recursive: true }, error => {
            if (error) {
                _logException(error);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function _remove(filePath: FilePath): Promise<void> {
    return new Promise((resolve, reject) => {
        rm(filePath, { recursive: true }, error => {
            if (error) {
                _logException(error);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function _size(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        lstat(filePath, (error, stats) => {
            if (error) {
                _logException(error);
                reject(error);
            } else {
                resolve(stats.size);
            }
        });
    });
}

function _copyFile(
    sourceFile: FilePath,
    destinationFile: FilePath
): Promise<void> {
    return new Promise((resolve, reject) => {
        copyFile(sourceFile, destinationFile, (error: Error | null) => {
            if (error) {
                _logException(error);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

async function _move(
    source: FilePath,
    destination: FilePath
): Promise<void> {
    if (source === destination) {
        /* Nothing to do */
        return;
    }

    const exists = await _exists(source);

    if (!exists) {
        throw new Error(`Source path does not exist: ${source}`);
    }

    /* if the source is a file & the destination is a directory, rename destination to the basename of the source file in the destination directory */
    if (await _isFile(source) && await _isDirectory(destination)) {
        destination = path.join(destination, path.basename(source));
    }

    // Ensure destination directory exists
    await _createDirectory(path.dirname(destination));

    /* If we attempt to copy across partitions, we need to use the copy command otherwise we will get EXDEV: cross-device link not permitted error */
    await _copyFile(source, destination);
    await _remove(source);
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

function _createTemporaryDirectory(prefix: FilePath): Promise<FilePath> {
    return new Promise((resolve, reject) => {
        const tempBase = getTemporaryDirectory() || tmpdir();
        mkdtemp(path.join(tempBase, prefix), (error, directoryPath) => {
            if (error) {
                _logException(error);
                reject(error);
            } else {
                resolve(directoryPath);
            }
        });
    });
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
            options?: { removePrefix?: boolean; recursive?: boolean; avoidHiddenFiles?: boolean }
        ) => {
            const results = await _listDirectory(filePath, {
                recursive: options?.recursive ?? parameters.recursive ?? false,
                removePrefix:
                    options?.removePrefix ?? parameters.removePrefix ?? false,
                avoidHiddenFiles: options?.avoidHiddenFiles ?? false,
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
