import { IStorageListOptions, StorageOptionListDefaults, IStorage } from './storage.interface';

describe('storage.interface.ts', () => {
    describe('IStorageListOptions', () => {
        it('should have optional properties', () => {
            /* Arrange & Act */
            const options: IStorageListOptions = {};

            /* Assert */
            expect(options).toBeDefined();
        });

        it('should allow all properties to be set', () => {
            /* Arrange & Act */
            const options: IStorageListOptions = {
                recursive: true,
                removePrefix: false,
                avoidHiddenFiles: true,
            };

            /* Assert */
            expect(options.recursive).toBe(true);
            expect(options.removePrefix).toBe(false);
            expect(options.avoidHiddenFiles).toBe(true);
        });
    });

    describe('StorageOptionListDefaults', () => {
        it('should have correct default values', () => {
            /* Assert */
            expect(StorageOptionListDefaults.recursive).toBe(true);
            expect(StorageOptionListDefaults.removePrefix).toBe(false);
            expect(StorageOptionListDefaults.avoidHiddenFiles).toBe(false);
        });

        it('should be a required IStorageListOptions', () => {
            /* Assert */
            expect(StorageOptionListDefaults).toMatchObject({
                recursive: true,
                removePrefix: false,
                avoidHiddenFiles: false,
            });
        });
    });

    describe('IStorage interface', () => {
        it('should define all required methods', () => {
            /* Arrange */
            const mockStorage: IStorage = {
                identifier: 'test-storage',
                write: jest.fn(),
                read: jest.fn(),
                list: jest.fn(),
                exists: jest.fn(),
                isFile: jest.fn(),
                isDirectory: jest.fn(),
                createDirectory: jest.fn(),
                remove: jest.fn(),
                size: jest.fn(),
                copy: jest.fn(),
                move: jest.fn(),
                createTemporaryDirectory: jest.fn(),
                pathSeparator: jest.fn(),
            };

            /* Assert */
            expect(mockStorage.identifier).toBe('test-storage');
            expect(typeof mockStorage.write).toBe('function');
            expect(typeof mockStorage.read).toBe('function');
            expect(typeof mockStorage.list).toBe('function');
            expect(typeof mockStorage.exists).toBe('function');
            expect(typeof mockStorage.isFile).toBe('function');
            expect(typeof mockStorage.isDirectory).toBe('function');
            expect(typeof mockStorage.createDirectory).toBe('function');
            expect(typeof mockStorage.remove).toBe('function');
            expect(typeof mockStorage.size).toBe('function');
            expect(typeof mockStorage.copy).toBe('function');
            expect(typeof mockStorage.move).toBe('function');
            expect(typeof mockStorage.createTemporaryDirectory).toBe('function');
            expect(typeof mockStorage.pathSeparator).toBe('function');
        });

        it('should allow methods to be called with correct parameters', async () => {
            /* Arrange */
            const mockStorage: IStorage = {
                identifier: 'test-storage',
                write: jest.fn().mockResolvedValue(undefined),
                read: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
                list: jest.fn().mockResolvedValue([]),
                exists: jest.fn().mockResolvedValue(true),
                isFile: jest.fn().mockResolvedValue(true),
                isDirectory: jest.fn().mockResolvedValue(false),
                createDirectory: jest.fn().mockResolvedValue(undefined),
                remove: jest.fn().mockResolvedValue(undefined),
                size: jest.fn().mockResolvedValue(1024),
                copy: jest.fn().mockResolvedValue(undefined),
                move: jest.fn().mockResolvedValue(undefined),
                createTemporaryDirectory: jest.fn().mockResolvedValue('/temp/dir'),
                pathSeparator: jest.fn().mockReturnValue('/'),
            };

            /* Act & Assert */
            await expect(mockStorage.write('/test/file', new ArrayBuffer(0))).resolves.toBeUndefined();
            await expect(mockStorage.read('/test/file')).resolves.toBeInstanceOf(ArrayBuffer);
            await expect(mockStorage.list('/test/dir')).resolves.toEqual([]);
            await expect(mockStorage.exists('/test/file')).resolves.toBe(true);
            await expect(mockStorage.isFile('/test/file')).resolves.toBe(true);
            await expect(mockStorage.isDirectory('/test/dir')).resolves.toBe(false);
            await expect(mockStorage.createDirectory('/test/dir')).resolves.toBeUndefined();
            await expect(mockStorage.remove('/test/file')).resolves.toBeUndefined();
            await expect(mockStorage.size('/test/file')).resolves.toBe(1024);
            await expect(mockStorage.copy('/test/source', '/test/dest')).resolves.toBeUndefined();
            await expect(mockStorage.move('/test/source', '/test/dest')).resolves.toBeUndefined();
            await expect(mockStorage.createTemporaryDirectory()).resolves.toBe('/temp/dir');
            expect(mockStorage.pathSeparator()).toBe('/');
        });

        it('should handle list method with options', async () => {
            /* Arrange */
            const mockStorage: IStorage = {
                identifier: 'test-storage',
                write: jest.fn(),
                read: jest.fn(),
                list: jest.fn().mockResolvedValue(['file1.txt', 'file2.txt']),
                exists: jest.fn(),
                isFile: jest.fn(),
                isDirectory: jest.fn(),
                createDirectory: jest.fn(),
                remove: jest.fn(),
                size: jest.fn(),
                copy: jest.fn(),
                move: jest.fn(),
                createTemporaryDirectory: jest.fn(),
                pathSeparator: jest.fn(),
            };

            const options: IStorageListOptions = {
                recursive: true,
                removePrefix: false,
                avoidHiddenFiles: true,
            };

            /* Act */
            const result = await mockStorage.list('/test/dir', options);

            /* Assert */
            expect(result).toEqual(['file1.txt', 'file2.txt']);
            expect(mockStorage.list).toHaveBeenCalledWith('/test/dir', options);
        });
    });
}); 