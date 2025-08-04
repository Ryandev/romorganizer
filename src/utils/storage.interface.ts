export interface IStorageListOptions {
    /**
     * When true, recursively lists all files and directories within subdirectories.
     * When false, only lists immediate children of the specified directory.
     * Default: false
     */
    recursive?: boolean;

    /**
     * When true, returns relative paths from the specified directory.
     * When false, returns absolute paths.
     * Default: false
     */
    removePrefix?: boolean;

    /**
     * When true, excludes hidden files and directories (those starting with '.').
     * When false, includes all files and directories.
     * Default: false
     */
    avoidHiddenFiles?: boolean;

    /**
     * When true, includes directories in the listing.
     * When false, only includes files.
     * Default: false
     */
    includeDirectories?: boolean;
}

export const StorageOptionListDefaults: Required<IStorageListOptions> = {
    recursive: true,
    removePrefix: false,
    avoidHiddenFiles: false,
    includeDirectories: false,
};

/**
 * Storage interface providing file system operations with cross-platform compatibility.
 * All paths are handled as strings and operations are asynchronous.
 */
export interface IStorage {
    /**
     * Unique identifier for this storage implementation.
     * Used to distinguish between different storage backends.
     */
    identifier: string;

    /**
     * Writes binary data to a file at the specified path.
     * Creates the file if it doesn't exist, overwrites if it does.
     *
     * @param path - Absolute path to the file to write
     * @param contents - Binary data to write to the file
     * @throws {Error} If the file cannot be written (e.g., permission denied, disk full)
     */
    write: (path: string, contents: ArrayBuffer) => Promise<void>;

    /**
     * Reads binary data from a file at the specified path.
     *
     * @param path - Absolute path to the file to read
     * @returns Promise resolving to the file contents as ArrayBuffer
     * @throws {Error} If the file doesn't exist or cannot be read
     */
    read: (path: string) => Promise<ArrayBuffer>;

    /**
     * Lists files and directories at the specified path.
     *
     * @param path - Absolute path to the directory to list
     * @param options - Optional configuration for listing behavior
     * @param options.recursive - When true, includes all subdirectories and their contents
     * @param options.removePrefix - When true, returns relative paths from the specified directory; when false, returns absolute paths
     * @param options.avoidHiddenFiles - When true, excludes hidden files and directories (those starting with '.')
     * @param options.includeDirectories - When true, includes directories in the listing
     * @returns Promise resolving to array of file/directory paths
     * @throws {Error} If the path doesn't exist or cannot be accessed
     */
    list: (path: string, options?: IStorageListOptions) => Promise<string[]>;

    /**
     * Checks if a file or directory exists at the specified path.
     *
     * @param path - Absolute path to check
     * @returns Promise resolving to true if the path exists, false otherwise
     */
    exists: (path: string) => Promise<boolean>;

    /**
     * Checks if the specified path is a regular file.
     *
     * @param path - Absolute path to check
     * @returns Promise resolving to true if the path is a file, false otherwise
     * @throws {Error} If the path doesn't exist
     */
    isFile: (path: string) => Promise<boolean>;

    /**
     * Checks if the specified path is a directory.
     *
     * @param path - Absolute path to check
     * @returns Promise resolving to true if the path is a directory, false otherwise
     * @throws {Error} If the path doesn't exist
     */
    isDirectory: (path: string) => Promise<boolean>;

    /**
     * Creates a directory at the specified path.
     * Creates parent directories as needed (recursive creation).
     *
     * @param path - Absolute path where the directory should be created
     * @throws {Error} If the directory cannot be created (e.g., permission denied, path already exists as file)
     */
    createDirectory: (path: string) => Promise<void>;

    /**
     * Removes a file or directory at the specified path.
     * For directories, removes recursively (including all contents).
     *
     * @param path - Absolute path to the file or directory to remove
     * @throws {Error} If the path doesn't exist or cannot be removed
     */
    remove: (path: string) => Promise<void>;

    /**
     * Gets the size of a file in bytes.
     *
     * @param path - Absolute path to the file
     * @returns Promise resolving to the file size in bytes
     * @throws {Error} If the path doesn't exist or is not a file
     */
    size: (path: string) => Promise<number>;

    /**
     * Copies a file or directory from source to destination.
     * For directories, copies recursively (including all contents).
     * Creates the destination directory if it doesn't exist.
     *
     * @param source - Absolute path to the source file or directory
     * @param destination - Absolute path where the copy should be created
     * @throws {Error} If the source doesn't exist or cannot be copied
     */
    copy: (source: string, destination: string) => Promise<void>;

    /**
     * Moves a file or directory from source to destination.
     * For directories, moves the entire directory to the destination folder.
     * Creates the destination directory if it doesn't exist.
     *
     * @param source - Absolute path to the source file or directory
     * @param destination - Absolute path where the item should be moved
     * @throws {Error} If the source doesn't exist or cannot be moved
     */
    move: (source: string, destination: string) => Promise<void>;

    /**
     * Creates a temporary directory with a unique name.
     * The directory is created in the system's temporary directory location or the specified base directory.
     *
     * @returns Promise resolving to the absolute path of the created temporary directory
     * @throws {Error} If a temporary directory cannot be created
     */
    createTemporaryDirectory: () => Promise<string>;

    /**
     * Returns the path separator character used by the current platform.
     *
     * @returns Path separator string ('/' for Unix-like systems, '\' for Windows)
     */
    pathSeparator: () => string;
}
