import fs, { Stats } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IStorage } from './storage.interface';

describe('local.read', () => {
    let mockOpen: jest.SpyInstance | undefined;
    let mockFSync: jest.SpyInstance | undefined;
    let mockClose: jest.SpyInstance | undefined;

    beforeEach(() => {
        mockOpen = jest.spyOn(fs, 'open');
        mockOpen.mockImplementation((_, __, callback) => {
            /* eslint-disable-next-line unicorn/no-null */
            callback(null, 123);
        });

        mockFSync = jest.spyOn(fs, 'fsync');
        mockFSync.mockImplementation((_, callback) => {
            /* eslint-disable-next-line unicorn/no-null */
            callback(null);
        });

        mockClose = jest.spyOn(fs, 'close');
        mockClose.mockImplementation((_, callback) => {
            /* eslint-disable-next-line unicorn/no-null */
            callback(null);
        });
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should read the file with the provided contents', async () => {
        const temporaryDirectory = os.tmpdir();
        const file = path.join(temporaryDirectory, 'test_1.txt');
        const contents = Buffer.alloc(10);

        const mockReadFile = jest
            .spyOn(fs, 'readFile')
            .mockImplementation((_, callback) => {
                /* eslint-disable-next-line unicorn/no-null */
                callback(null, contents);
            });

        /* @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access */
        const storage =
            (await require('./storage').default()) as unknown as IStorage;

        await storage.read(file);

        expect(mockReadFile).toHaveBeenCalledTimes(1);
        expect(mockReadFile).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Function)
        );

        expect(mockOpen).toHaveBeenCalledTimes(1);
        expect(mockOpen).toHaveBeenCalledWith(file, 'r', expect.any(Function));

        expect(mockFSync).toHaveBeenCalledTimes(1);
        expect(mockFSync).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Function)
        );

        expect(mockClose).toHaveBeenCalledTimes(1);
        expect(mockClose).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Function)
        );
    });

    test('should reject with an error if readFile fails', async () => {
        const temporaryDirectory = os.tmpdir();
        const file = path.join(temporaryDirectory, 'test_2.txt');
        const error = new Error('Read file failed');

        const mockReadFile = jest
            .spyOn(fs, 'readFile')
            .mockImplementation((_, callback) => {
                /* eslint-disable-next-line unicorn/no-null */
                callback(error, null as unknown as Buffer);
            });

        /* @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access */
        const storage =
            (await require('./storage').default()) as unknown as IStorage;

        const result = await storage
            .read(file)
            .catch((error: unknown) => error);
        expect(mockReadFile).toHaveBeenCalledTimes(1);
        expect(mockReadFile).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Function)
        );
        expect(result).toBe(error);

        /* Verify we still open & close fd correctly */
        expect(mockOpen).toHaveBeenCalledTimes(1);
        expect(mockOpen).toHaveBeenCalledWith(file, 'r', expect.any(Function));

        expect(mockFSync).toHaveBeenCalledTimes(1);
        expect(mockFSync).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Function)
        );

        expect(mockClose).toHaveBeenCalledTimes(1);
        expect(mockClose).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Function)
        );
    });
});

describe('local.write', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should write the file with the provided contents', async () => {
        const temporaryDirectory = os.tmpdir();
        const file = path.join(temporaryDirectory, 'test_3.txt');
        const contents = new ArrayBuffer(10);

        const mockWriteFile = jest
            .spyOn(fs, 'writeFile')
            .mockImplementation((_, __, callback) => {
                /* eslint-disable-next-line unicorn/no-null */
                callback(null);
            });

        /* @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access */
        const storage =
            (await require('./storage').default()) as unknown as IStorage;

        await storage.write(file, contents);

        expect(mockWriteFile).toHaveBeenCalledTimes(1);
        expect(mockWriteFile).toHaveBeenCalledWith(
            expect.any(Number),
            Uint8Array.from(Buffer.from(contents)),
            expect.any(Function)
        );

        /* Cleanup */
        await storage.remove(file).catch(() => {
            /* no-op */
        });
    });

    test('should reject with an error if writeFile fails', async () => {
        const temporaryDirectory = os.tmpdir();
        const file = path.join(temporaryDirectory, 'test_4.txt');
        const contents = new ArrayBuffer(10);
        const error = new Error('Write file failed');

        const mockWriteFile = jest
            .spyOn(fs, 'writeFile')
            .mockImplementation((_, __, callback) => {
                callback(error);
            });

        /* @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access */
        const storage =
            (await require('./storage').default()) as unknown as IStorage;

        await expect(storage.write(file, contents)).rejects.toEqual(error);
        expect(mockWriteFile).toHaveBeenCalledTimes(1);

        /* Cleanup */
        await storage.remove(file).catch(() => {
            /* no-op */
        });
    });
});

describe('local.exists', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return true for exists', async () => {
        const temporaryDirectory = os.tmpdir();
        const file = path.join(temporaryDirectory, 'test_5.txt');

        const mockAccess = jest
            .spyOn(fs, 'access')
            .mockImplementation((path, callback) => {
                /* eslint-disable-next-line unicorn/no-null */
                callback(null);
            });

        /* @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access */
        const storage =
            (await require('./storage').default()) as unknown as IStorage;

        const exists = await storage.exists(file);

        expect(exists).toBeTruthy();
        expect(mockAccess).toHaveBeenCalledWith(
            file,
            expect.any(Number),
            expect.any(Function)
        );
    });
});

describe('local.size', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return correct file size', async () => {
        const temporaryDirectory = os.tmpdir();
        const file = path.join(temporaryDirectory, 'test_6.txt');
        const size = 200;

        const mockLStat = jest
            .spyOn(fs, 'lstat')
            .mockImplementation((path, callback) => {
                if (callback) {
                    /* eslint-disable-next-line unicorn/no-null */
                    callback(null, {
                        size,
                    } as unknown as Stats);
                }
            });

        /* @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access */
        const storage =
            (await require('./storage').default()) as unknown as IStorage;

        const returnSize = await storage.size(file);

        expect(returnSize).toBe(size);
        expect(mockLStat).toHaveBeenCalledWith(file, expect.any(Function));
    });

    test('should reject size when the file does not exist', async () => {
        const error = new Error('File does not exist');

        jest.spyOn(fs, 'lstat').mockImplementation((path, callback) => {
            if (callback) {
                callback(error);
            }
        });

        /* @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access */
        const storage =
            (await require('./storage').default()) as unknown as IStorage;

        await expect(storage.size('anything')).rejects.toEqual(error);
    });
});

describe('local.isDirectory', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return true if the filePath represents a directory', async () => {
        const temporaryDirectory = os.tmpdir();
        const file = path.join(temporaryDirectory, 'test_7.txt');
        const isDirectoryResult = true;

        const mockAccess = jest
            .spyOn(fs, 'access')
            .mockImplementation((path, callback) => {
                /* eslint-disable-next-line unicorn/no-null */
                callback(null);
            });

        const mockLStat = jest
            .spyOn(fs, 'lstat')
            .mockImplementation((path, callback) => {
                if (callback) {
                    /* eslint-disable-next-line unicorn/no-null */
                    callback(null, {
                        isDirectory: () => isDirectoryResult,
                    } as unknown as Stats);
                }
            });

        /* @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access */
        const storage =
            (await require('./storage').default()) as unknown as IStorage;

        const isDirectory = await storage.isDirectory(file);

        //this line is wrong
        expect(isDirectory).toBeTruthy();
        expect(mockAccess).toHaveBeenCalledWith(file, 4, expect.any(Function));
        expect(mockLStat).toHaveBeenCalledWith(file, expect.any(Function));
    });

    it('should return false if the filePath does not represent a directory', async () => {
        const temporaryDirectory = os.tmpdir();
        const file = path.join(temporaryDirectory, 'test_8.txt');
        const isDirectoryResult = false;

        const mockAccess = jest
            .spyOn(fs, 'access')
            .mockImplementation((path, callback) => {
                /* eslint-disable-next-line unicorn/no-null */
                callback(null);
            });

        const mockLStat = jest
            .spyOn(fs, 'lstat')
            .mockImplementation((path, callback) => {
                if (callback) {
                    /* eslint-disable-next-line unicorn/no-null */
                    callback(null, {
                        isDirectory: () => isDirectoryResult,
                    } as unknown as Stats);
                }
            });

        /* @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        const storage =
            (await require('./storage').default()) as unknown as IStorage;

        const isDirectory = await storage.isDirectory(file);

        expect(isDirectory).toBeFalsy();
        expect(mockAccess).toHaveBeenCalledWith(file, 4, expect.any(Function));
        expect(mockLStat).toHaveBeenCalledWith(file, expect.any(Function));
    });
});

describe('local.createTemporaryDirectory', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return when created a temporary directory', async () => {
        const fakePath = '/new/path';

        const mockMkdtemp = jest
            .spyOn(fs, 'mkdtemp')
            .mockImplementation((_, callback) => {
                /* eslint-disable-next-line unicorn/no-null */
                callback(null, fakePath);
            });

        /* @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        const storage =
            (await require('./storage').default()) as unknown as IStorage;

        const newDirectory = await storage.createTemporaryDirectory();

        expect(newDirectory).toBe(fakePath);
        expect(mockMkdtemp).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Function)
        );
    });

    it('should return error when creates a temporary directory', async () => {
        const error = new Error('Invalid path');

        const mockMkdtemp = jest
            .spyOn(fs, 'mkdtemp')
            .mockImplementation((_, callback) => {
                callback(error, '');
            });

        /* @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        const storage =
            (await require('./storage').default()) as unknown as IStorage;

        await expect(storage.createTemporaryDirectory()).rejects.toEqual(error);

        expect(mockMkdtemp).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Function)
        );
    });
});
