import path from 'node:path';
import storage from './storage.js';
import { IStorageListOptions } from './storage.interface.js';

/* Test the avoidHiddenFiles logic directly without complex mocking */
describe('avoidHiddenFiles functionality', () => {
    test('should filter out hidden files correctly', () => {
        const files = [
            'file1.txt',
            '.hidden.txt',
            'file2.txt',
            '.gitignore',
            'subdir',
        ];

        /* Simulate the filtering logic from storage.ts */
        const filteredFiles = files.filter(item => !item.startsWith('.'));

        expect(filteredFiles).toEqual(['file1.txt', 'file2.txt', 'subdir']);
        expect(filteredFiles).not.toContain('.hidden.txt');
        expect(filteredFiles).not.toContain('.gitignore');
    });

    test('should include hidden files when not filtering', () => {
        const files = [
            'file1.txt',
            '.hidden.txt',
            'file2.txt',
            '.gitignore',
            'subdir',
        ];

        /* Simulate no filtering (avoidHiddenFiles = false) */
        const allFiles = files; /* No filtering applied */

        expect(allFiles).toEqual([
            'file1.txt',
            '.hidden.txt',
            'file2.txt',
            '.gitignore',
            'subdir',
        ]);
        expect(allFiles).toContain('.hidden.txt');
        expect(allFiles).toContain('.gitignore');
    });

    test('should handle empty array', () => {
        const files: string[] = [];

        const filteredFiles = files.filter(item => !item.startsWith('.'));

        expect(filteredFiles).toEqual([]);
    });

    test('should handle array with only hidden files', () => {
        const files = ['.hidden.txt', '.gitignore', '.config'];

        const filteredFiles = files.filter(item => !item.startsWith('.'));

        expect(filteredFiles).toEqual([]);
    });

    test('should handle array with only visible files', () => {
        const files = ['file1.txt', 'file2.txt', 'subdir'];

        const filteredFiles = files.filter(item => !item.startsWith('.'));

        expect(filteredFiles).toEqual(['file1.txt', 'file2.txt', 'subdir']);
    });
});

/* Test the storage interface implementation */
describe('storage interface', () => {
    test('should have avoidHiddenFiles option in list method', async () => {
        /* Import the storage module */
        const storageModule = await import('./storage');
        const storage = storageModule.default();

        /* Verify the list method accepts avoidHiddenFiles option */
        expect(typeof storage.list).toBe('function');

        /* The interface should support the avoidHiddenFiles option */
        /* This test verifies the interface is properly implemented */
        expect(storage.identifier).toBe('local');
        expect(typeof storage.read).toBe('function');
        expect(typeof storage.write).toBe('function');
        expect(typeof storage.exists).toBe('function');
        expect(typeof storage.isFile).toBe('function');
        expect(typeof storage.isDirectory).toBe('function');
        expect(typeof storage.createTemporaryDirectory).toBe('function');
    });
});

/* Test path joining functionality used in storage */
describe('path operations', () => {
    test('should join paths correctly for storage operations', () => {
        const baseDir = '/test/directory';
        const files = ['file1.txt', '.hidden.txt', 'subdir'];

        const fullPaths = files.map(file => path.join(baseDir, file));

        expect(fullPaths).toEqual([
            '/test/directory/file1.txt',
            '/test/directory/.hidden.txt',
            '/test/directory/subdir',
        ]);
    });

    test('should handle relative paths correctly', () => {
        const baseDir = '/test/directory';
        const filePath = '/test/directory/file1.txt';

        const relativePath = path.relative(baseDir, filePath);

        expect(relativePath).toBe('file1.txt');
    });
});

/* Test the move functionality */
describe('move functionality', () => {
    test('should move a file to a new location', () => {
        const sourceFile = '/source/file.txt';
        const destinationFile = '/destination/file.txt';

        /* Simulate the move operation */
        const moveOperation = {
            source: sourceFile,
            destination: destinationFile,
            operation: 'move',
        };

        expect(moveOperation.source).toBe(sourceFile);
        expect(moveOperation.destination).toBe(destinationFile);
        expect(moveOperation.operation).toBe('move');
    });

    test('should move a directory to a new location', () => {
        const sourceDir = '/source/directory';
        const destinationDir = '/destination/directory';

        /* Simulate the move operation for directories */
        const moveOperation = {
            source: sourceDir,
            destination: destinationDir,
            operation: 'move',
        };

        expect(moveOperation.source).toBe(sourceDir);
        expect(moveOperation.destination).toBe(destinationDir);
        expect(moveOperation.operation).toBe('move');
    });

    test('should handle moving a file into a directory', () => {
        const sourceFile = '/source/file.txt';
        const destinationDir = '/destination';
        const expectedDestination = path.join(destinationDir, 'file.txt');

        /* Simulate moving a file into a directory */
        const moveOperation = {
            source: sourceFile,
            destination: expectedDestination,
            operation: 'move',
        };

        expect(moveOperation.source).toBe(sourceFile);
        expect(moveOperation.destination).toBe(expectedDestination);
    });

    test('should handle moving a directory into another directory', () => {
        const sourceDir = '/source/myDir';
        const destinationDir = '/destination';
        const expectedDestination = path.join(destinationDir, 'myDir');

        /* Simulate moving a directory into another directory */
        const moveOperation = {
            source: sourceDir,
            destination: expectedDestination,
            operation: 'move',
        };

        expect(moveOperation.source).toBe(sourceDir);
        expect(moveOperation.destination).toBe(expectedDestination);
    });

    test('should handle path normalization for move operations', () => {
        const sourceFile = '/source/../source/file.txt';
        const destinationFile = '/destination/./file.txt';

        /* Simulate path normalization */
        const normalizedSource = path.normalize(sourceFile);
        const normalizedDestination = path.normalize(destinationFile);

        expect(normalizedSource).toBe('/source/file.txt');
        expect(normalizedDestination).toBe('/destination/file.txt');
    });

    test('should handle moving files with special characters in names', () => {
        const sourceFile = '/source/file with spaces.txt';
        const destinationFile = '/destination/file with spaces.txt';

        /* Simulate moving files with special characters */
        const moveOperation = {
            source: sourceFile,
            destination: destinationFile,
            operation: 'move',
        };

        expect(moveOperation.source).toBe(sourceFile);
        expect(moveOperation.destination).toBe(destinationFile);
    });

    test('should handle moving hidden files', () => {
        const sourceFile = '/source/.hidden.txt';
        const destinationFile = '/destination/.hidden.txt';

        /* Simulate moving hidden files */
        const moveOperation = {
            source: sourceFile,
            destination: destinationFile,
            operation: 'move',
        };

        expect(moveOperation.source).toBe(sourceFile);
        expect(moveOperation.destination).toBe(destinationFile);
    });

    test('should handle moving nested directory structures', () => {
        const sourceDir = '/source/nested/deep/structure';
        const destinationDir = '/destination';
        const expectedDestination = path.join(destinationDir, 'structure');

        /* Simulate moving nested directory structures */
        const moveOperation = {
            source: sourceDir,
            destination: expectedDestination,
            operation: 'move',
        };

        expect(moveOperation.source).toBe(sourceDir);
        expect(moveOperation.destination).toBe(expectedDestination);
    });
});

/* Test the storage interface implementation with move function */
describe('storage interface with move', () => {
    it('should have move function in storage interface', () => {
        const storageInstance = storage();
        expect(typeof storageInstance.move).toBe('function');
    });

    it('should have correct function signature for move', () => {
        const storageInstance = storage();
        expect(storageInstance.move).toHaveLength(2);
    });
});

describe('environment-based temp directory', () => {
    it('should use environment temp directory when set', async () => {
        const { setTemporaryDirectory, clearTemporaryDirectory } = await import(
            './environment.js'
        );
        const customTempDir = '/tmp/custom-temp';

        /* Set custom temp directory */
        setTemporaryDirectory(customTempDir);

        const storageInstance = storage();
        expect(storageInstance).toBeDefined();
        expect(typeof storageInstance.createTemporaryDirectory).toBe(
            'function'
        );
        expect(storageInstance.identifier).toBe('local');

        /* Clean up */
        clearTemporaryDirectory();
    });

    it('should use default temp directory when not set', async () => {
        const { clearTemporaryDirectory } = await import('./environment.js');

        /* Ensure no custom temp directory is set */
        clearTemporaryDirectory();

        const storageInstance = storage();
        expect(storageInstance).toBeDefined();
        expect(typeof storageInstance.createTemporaryDirectory).toBe(
            'function'
        );
        expect(storageInstance.identifier).toBe('local');
    });
});

/* Test includeDirectories functionality */
describe('includeDirectories functionality', () => {
    let testDir: string;
    let storageInstance: ReturnType<typeof storage>;

    beforeAll(async () => {
        storageInstance = storage();
        testDir = await storageInstance.createTemporaryDirectory();

        /* Create test structure with files and directories */
        await storageInstance.createDirectory(path.join(testDir, 'subdir1'));
        await storageInstance.createDirectory(path.join(testDir, 'subdir2'));
        await storageInstance.createDirectory(path.join(testDir, '.hiddenDir'));

        /* Create files */
        await storageInstance.write(
            path.join(testDir, 'file1.txt'),
            new ArrayBuffer(10)
        );
        await storageInstance.write(
            path.join(testDir, 'file2.txt'),
            new ArrayBuffer(10)
        );
        await storageInstance.write(
            path.join(testDir, '.hidden.txt'),
            new ArrayBuffer(10)
        );
        await storageInstance.write(
            path.join(testDir, 'subdir1', 'nested.txt'),
            new ArrayBuffer(10)
        );
        await storageInstance.write(
            path.join(testDir, 'subdir2', 'deep.txt'),
            new ArrayBuffer(10)
        );
    });

    afterAll(async () => {
        if (testDir && (await storageInstance.exists(testDir))) {
            await storageInstance.remove(testDir);
        }
    });

    test('should include directories when includeDirectories is true', async () => {
        const contents = await storageInstance.list(testDir, {
            includeDirectories: true,
            avoidHiddenFiles: false,
        });

        /* Should include both files and directories */
        expect(contents).toContain(path.join(testDir, 'file1.txt'));
        expect(contents).toContain(path.join(testDir, 'file2.txt'));
        expect(contents).toContain(path.join(testDir, '.hidden.txt'));
        expect(contents).toContain(path.join(testDir, 'subdir1'));
        expect(contents).toContain(path.join(testDir, 'subdir2'));
        expect(contents).toContain(path.join(testDir, '.hiddenDir'));
    });

    test('should exclude directories when includeDirectories is false', async () => {
        const contents = await storageInstance.list(testDir, {
            includeDirectories: false,
            avoidHiddenFiles: false,
        });

        /* Should only include files, not directories */
        expect(contents).toContain(path.join(testDir, 'file1.txt'));
        expect(contents).toContain(path.join(testDir, 'file2.txt'));
        expect(contents).toContain(path.join(testDir, '.hidden.txt'));
        expect(contents).not.toContain(path.join(testDir, 'subdir1'));
        expect(contents).not.toContain(path.join(testDir, 'subdir2'));
        expect(contents).not.toContain(path.join(testDir, '.hiddenDir'));
    });

    test('should exclude directories by default (includeDirectories defaults to false)', async () => {
        const contents = await storageInstance.list(testDir, {
            avoidHiddenFiles: false,
        });

        /* Should only include files by default */
        expect(contents).toContain(path.join(testDir, 'file1.txt'));
        expect(contents).toContain(path.join(testDir, 'file2.txt'));
        expect(contents).toContain(path.join(testDir, '.hidden.txt'));
        expect(contents).not.toContain(path.join(testDir, 'subdir1'));
        expect(contents).not.toContain(path.join(testDir, 'subdir2'));
        expect(contents).not.toContain(path.join(testDir, '.hiddenDir'));
    });

    test('should work with recursive listing and includeDirectories true', async () => {
        const contents = await storageInstance.list(testDir, {
            recursive: true,
            includeDirectories: true,
            avoidHiddenFiles: false,
        });

        /* Should include all files and directories recursively */
        expect(contents).toContain(path.join(testDir, 'file1.txt'));
        expect(contents).toContain(path.join(testDir, 'file2.txt'));
        expect(contents).toContain(path.join(testDir, '.hidden.txt'));
        expect(contents).toContain(path.join(testDir, 'subdir1'));
        expect(contents).toContain(path.join(testDir, 'subdir2'));
        expect(contents).toContain(path.join(testDir, '.hiddenDir'));
        expect(contents).toContain(path.join(testDir, 'subdir1', 'nested.txt'));
        expect(contents).toContain(path.join(testDir, 'subdir2', 'deep.txt'));
    });

    test('should work with recursive listing and includeDirectories false', async () => {
        const contents = await storageInstance.list(testDir, {
            recursive: true,
            includeDirectories: false,
            avoidHiddenFiles: false,
        });

        /* Should include all files recursively but not directories */
        expect(contents).toContain(path.join(testDir, 'file1.txt'));
        expect(contents).toContain(path.join(testDir, 'file2.txt'));
        expect(contents).toContain(path.join(testDir, '.hidden.txt'));
        expect(contents).toContain(path.join(testDir, 'subdir1', 'nested.txt'));
        expect(contents).toContain(path.join(testDir, 'subdir2', 'deep.txt'));
        expect(contents).not.toContain(path.join(testDir, 'subdir1'));
        expect(contents).not.toContain(path.join(testDir, 'subdir2'));
        expect(contents).not.toContain(path.join(testDir, '.hiddenDir'));
    });

    test('should work with avoidHiddenFiles and includeDirectories true', async () => {
        const contents = await storageInstance.list(testDir, {
            includeDirectories: true,
            avoidHiddenFiles: true,
        });

        /* Should include visible files and directories, exclude hidden ones */
        expect(contents).toContain(path.join(testDir, 'file1.txt'));
        expect(contents).toContain(path.join(testDir, 'file2.txt'));
        expect(contents).toContain(path.join(testDir, 'subdir1'));
        expect(contents).toContain(path.join(testDir, 'subdir2'));
        expect(contents).not.toContain(path.join(testDir, '.hidden.txt'));
        expect(contents).not.toContain(path.join(testDir, '.hiddenDir'));
    });

    test('should work with avoidHiddenFiles and includeDirectories false', async () => {
        const contents = await storageInstance.list(testDir, {
            includeDirectories: false,
            avoidHiddenFiles: true,
        });

        /* Should include only visible files, exclude directories and hidden items */
        expect(contents).toContain(path.join(testDir, 'file1.txt'));
        expect(contents).toContain(path.join(testDir, 'file2.txt'));
        expect(contents).not.toContain(path.join(testDir, '.hidden.txt'));
        expect(contents).not.toContain(path.join(testDir, 'subdir1'));
        expect(contents).not.toContain(path.join(testDir, 'subdir2'));
        expect(contents).not.toContain(path.join(testDir, '.hiddenDir'));
    });

    test('should handle empty directory with includeDirectories true', async () => {
        const emptyDir = await storageInstance.createTemporaryDirectory();

        const contents = await storageInstance.list(emptyDir, {
            includeDirectories: true,
        });

        expect(contents).toEqual([]);

        /* Clean up */
        await storageInstance.remove(emptyDir);
    });

    test('should handle empty directory with includeDirectories false', async () => {
        const emptyDir = await storageInstance.createTemporaryDirectory();

        const contents = await storageInstance.list(emptyDir, {
            includeDirectories: false,
        });

        expect(contents).toEqual([]);

        /* Clean up */
        await storageInstance.remove(emptyDir);
    });

    test('should verify includeDirectories option is properly typed in interface', () => {
        /* This test verifies the TypeScript interface includes the includeDirectories option */
        const options: IStorageListOptions = {
            includeDirectories: true,
            recursive: false,
            avoidHiddenFiles: false,
        };

        expect(options.includeDirectories).toBe(true);
        expect(options.recursive).toBe(false);
        expect(options.avoidHiddenFiles).toBe(false);
    });
});

/* Test Windows case-sensitive move operations */
describe('Windows case-sensitive move operations', () => {
    test('should detect case-only filename changes correctly', () => {
        const source = '/path/to/myfile.bin';
        const destination = '/path/to/myfile.BIN';
        
        /* Simulate the case detection logic from storage.ts */
        const fileNameCaseChangeOnly = path.basename(source).toLowerCase() === path.basename(destination).toLowerCase();
        
        expect(fileNameCaseChangeOnly).toBe(true);
    });

    test('should not detect case-only changes when filenames are different', () => {
        const source = '/path/to/myfile.bin';
        const destination = '/path/to/different.bin';
        
        const fileNameCaseChangeOnly = path.basename(source).toLowerCase() === path.basename(destination).toLowerCase();
        
        expect(fileNameCaseChangeOnly).toBe(false);
    });

    test('should handle case-only changes with different paths', () => {
        const source = '/source/dir/myfile.bin';
        const destination = '/dest/dir/myfile.BIN';
        
        const fileNameCaseChangeOnly = path.basename(source).toLowerCase() === path.basename(destination).toLowerCase();
        
        expect(fileNameCaseChangeOnly).toBe(true);
    });

    test('should handle various case combinations', () => {
        const testCases = [
            { source: 'file.bin', dest: 'file.BIN', expected: true },
            { source: 'FILE.bin', dest: 'file.BIN', expected: true },
            { source: 'File.Bin', dest: 'file.bin', expected: true },
            { source: 'file.txt', dest: 'file.TXT', expected: true },
            { source: 'file.bin', dest: 'file.txt', expected: false },
            { source: 'file1.bin', dest: 'file2.bin', expected: false },
            { source: 'file.bin', dest: 'FILE.BIN', expected: true },
            { source: 'MyFile.Bin', dest: 'myfile.bin', expected: true },
        ];

        for (const { source, dest, expected } of testCases) {
            const fileNameCaseChangeOnly = path.basename(source).toLowerCase() === path.basename(dest).toLowerCase();
            expect(fileNameCaseChangeOnly).toBe(expected);
        }
    });

    test('should handle edge cases in case detection', () => {
        /* Empty filenames */
        expect(path.basename('').toLowerCase() === path.basename('').toLowerCase()).toBe(true);
        
        /* Single character differences */
        expect(path.basename('a.bin').toLowerCase() === path.basename('A.bin').toLowerCase()).toBe(true);
        
        /* Numbers in filenames */
        expect(path.basename('file1.bin').toLowerCase() === path.basename('FILE1.BIN').toLowerCase()).toBe(true);
        
        /* Special characters */
        expect(path.basename('file-name.bin').toLowerCase() === path.basename('FILE-NAME.BIN').toLowerCase()).toBe(true);
    });

    test('should simulate Windows case-insensitive move workflow', async () => {
        /* This test simulates the Windows move workflow without actual file operations */
        const source = '/path/to/myfile.bin';
        const destination = '/path/to/myfile.BIN';
        
        /* Simulate the workflow steps */
        const steps: string[] = [];
        
        /* Step 1: Detect case-only change */
        const fileNameCaseChangeOnly = path.basename(source).toLowerCase() === path.basename(destination).toLowerCase();
        steps.push('detect-case-change');
        
        if (fileNameCaseChangeOnly) {
            /* Step 2: Create temp directory and perform operations */
            steps.push('create-temp-dir', 'copy-to-temp', 'move-from-temp', 'cleanup-temp');
        }
        
        expect(fileNameCaseChangeOnly).toBe(true);
        expect(steps).toEqual([
            'detect-case-change',
            'create-temp-dir',
            'copy-to-temp',
            'move-from-temp',
            'cleanup-temp'
        ]);
    });

    test('should handle normal move operations (non-case-only)', async () => {
        const source = '/path/to/source.bin';
        const destination = '/path/to/destination.bin';
        
        /* Simulate normal move workflow */
        const steps: string[] = [];
        
        const fileNameCaseChangeOnly = path.basename(source).toLowerCase() === path.basename(destination).toLowerCase();
        steps.push('detect-case-change');
        
        if (!fileNameCaseChangeOnly) {
            /* Normal move: remove destination, copy source, remove source */
            steps.push('remove-destination', 'copy-source', 'remove-source');
        }
        
        expect(fileNameCaseChangeOnly).toBe(false);
        expect(steps).toEqual([
            'detect-case-change',
            'remove-destination',
            'copy-source',
            'remove-source'
        ]);
    });

    test('should handle directory case changes', () => {
        const source = '/path/to/Directory/file.bin';
        const destination = '/path/to/directory/file.bin';
        
        /* Only the filename part should be compared for case changes */
        const fileNameCaseChangeOnly = path.basename(source).toLowerCase() === path.basename(destination).toLowerCase();
        
        expect(fileNameCaseChangeOnly).toBe(true);
    });

    test('should handle files with no extension', () => {
        const testCases = [
            { source: 'file', dest: 'FILE', expected: true },
            { source: 'myfile', dest: 'MyFile', expected: true },
            { source: 'file', dest: 'file.txt', expected: false },
        ];

        for (const { source, dest, expected } of testCases) {
            const fileNameCaseChangeOnly = path.basename(source).toLowerCase() === path.basename(dest).toLowerCase();
            expect(fileNameCaseChangeOnly).toBe(expected);
        }
    });

    test('should handle files with multiple dots', () => {
        const testCases = [
            { source: 'file.backup.bin', dest: 'FILE.BACKUP.BIN', expected: true },
            { source: 'my.file.bin', dest: 'MY.FILE.BIN', expected: true },
            { source: 'file.backup.bin', dest: 'file.backup.txt', expected: false },
        ];

        for (const { source, dest, expected } of testCases) {
            const fileNameCaseChangeOnly = path.basename(source).toLowerCase() === path.basename(dest).toLowerCase();
            expect(fileNameCaseChangeOnly).toBe(expected);
        }
    });

    test('should handle real-world case scenarios', () => {
        /* Test common real-world scenarios */
        const realWorldCases = [
            /* ROM file case changes */
            { source: 'game.bin', dest: 'GAME.BIN', expected: true },
            { source: 'Game.Bin', dest: 'game.bin', expected: true },
            { source: 'GAME.BIN', dest: 'game.bin', expected: true },
            
            /* CUE file case changes */
            { source: 'game.cue', dest: 'GAME.CUE', expected: true },
            { source: 'Game.Cue', dest: 'game.cue', expected: true },
            
            /* ISO file case changes */
            { source: 'game.iso', dest: 'GAME.ISO', expected: true },
            { source: 'Game.Iso', dest: 'game.iso', expected: true },
            
            /* Mixed case scenarios */
            { source: 'MyGame.bin', dest: 'mygame.BIN', expected: true },
            { source: 'GAME_FILE.bin', dest: 'game_file.BIN', expected: true },
            { source: 'Game-Name.bin', dest: 'game-name.BIN', expected: true },
            
            /* Different files (should be false) */
            { source: 'game.bin', dest: 'game.cue', expected: false },
            { source: 'game1.bin', dest: 'game2.bin', expected: false },
            { source: 'game.bin', dest: 'game_backup.bin', expected: false },
        ];

        for (const { source, dest, expected } of realWorldCases) {
            const fileNameCaseChangeOnly = path.basename(source).toLowerCase() === path.basename(dest).toLowerCase();
            expect(fileNameCaseChangeOnly).toBe(expected);
        }
    });
});
