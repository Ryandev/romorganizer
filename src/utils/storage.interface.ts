export interface IStorageListOptions {
    recursive?: boolean;
    removePrefix?: boolean;
}

export const StorageOptionListDefaults: Required<IStorageListOptions> = {
    recursive: true,
    removePrefix: false,
};

export interface IStorage {
    identifier: string;
    write: (path: string, contents: ArrayBuffer) => Promise<void>;
    read: (path: string) => Promise<ArrayBuffer>;
    list: (path: string, options?: IStorageListOptions) => Promise<string[]>;
    exists: (path: string) => Promise<boolean>;
    isFile: (path: string) => Promise<boolean>;
    isDirectory: (path: string) => Promise<boolean>;
    createDirectory: (path: string) => Promise<void>;
    remove: (path: string) => Promise<void>;
    size: (path: string) => Promise<number>;
    copy: (source: string, destination: string) => Promise<void>;
    createTemporaryDirectory: () => Promise<string>;
    pathSeparator: () => string /* String denoting the path character. Linux/BSD='/' Windows='\' */;
}
