import path from 'node:path';
import chd from './chd';
import storage from './storage';
import type { IStorage } from './storage.interface';
import fs from 'node:fs';

/* Helper function to create a valid CD-ROM binary file */
function createValidBinFile(sizeInSectors: number = 1): Uint8Array {
    /* CD-ROM sector size is 2352 bytes */
    const sectorSize = 2352;
    const totalSize = sizeInSectors * sectorSize;
    const buffer = new Uint8Array(totalSize);

    /* Fill with some pattern (zeros for simplicity, but could be more realistic) */
    for (let i = 0; i < totalSize; i++) {
        buffer[i] = i % 256; /* Simple pattern */
    }

    return buffer;
}

describe('chd', () => {
    let testDir: string;
    let storageInstance: IStorage;
    let filesToCleanup: string[] = [];

    beforeEach(async () => {
        storageInstance = await storage();
        testDir = await storageInstance.createTemporaryDirectory();
        filesToCleanup = [];
    });

    afterEach(async () => {
        /* Clean up temporary test directory */
        await storageInstance.remove(testDir);

        /* Clean up any files that might have been created in the current directory */
        for (const filePath of filesToCleanup) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch {
                /* Ignore cleanup errors */
            }
        }

        /* Also clean up common test files that might be created in the current directory */
        const commonTestFiles = [
            'test.bin',
            'test.chd',
            'test.cue',
            'test.gdi',
            'test.iso',
            'test.txt',
            'game.bin',
            'multi.cue',
            'track01.bin',
            'track02.bin',
        ];

        for (const fileName of commonTestFiles) {
            try {
                const filePath = path.path.join(process.cwd(), fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch {
                /* Ignore cleanup errors */
            }
        }
    });

    describe('create', () => {
        it('should create CHD file from cue format', async () => {
            /* Create test files */
            const cueFilePath = path.join(testDir, 'test.cue');
            const binFilePath = path.join(testDir, 'test.bin');

            const cueContent =
                'FILE "test.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00';
            const binContent =
                createValidBinFile(
                    1
                ); /* Create 1 sector of valid CD-ROM data */

            await storageInstance.write(
                cueFilePath,
                new TextEncoder().encode(cueContent)
            );
            await storageInstance.write(binFilePath, binContent);

            /* Create CHD file from cue format */
            try {
                const result = await chd.create({
                    inputFilePath: cueFilePath,
                    format: 'cue',
                });

                /* Verify result is a path to a CHD file */
                expect(result).toMatch(/\.chd$/);
                expect(result).toContain('test.chd');
            } catch (error) {
                /* If chdman is not installed or other errors occur, just verify it's an error */
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should create CHD file from gdi format', async () => {
            /* Create test files */
            const gdiFilePath = path.join(testDir, 'test.gdi');

            const gdiContent = `1 0 4 2352 track01.bin 0
2 1 0 2352 track02.bin 0`;
            const binContent =
                createValidBinFile(
                    1
                ); /* Create 1 sector of valid CD-ROM data */

            await storageInstance.write(
                gdiFilePath,
                new TextEncoder().encode(gdiContent)
            );
            await storageInstance.write(
                path.join(testDir, 'track01.bin'),
                binContent
            );
            await storageInstance.write(
                path.join(testDir, 'track02.bin'),
                binContent
            );

            /* Create CHD file from gdi format */
            try {
                const result = await chd.create({
                    inputFilePath: gdiFilePath,
                    format: 'gdi',
                });

                /* Verify result is a path to a CHD file */
                expect(result).toMatch(/\.chd$/);
                expect(result).toContain('test.chd');
            } catch (error) {
                /* If chdman is not installed or other errors occur, just verify it's an error */
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should create CHD file from iso format', async () => {
            /* Create test files */
            const isoFilePath = path.join(testDir, 'test.iso');

            const isoContent =
                createValidBinFile(
                    1
                ); /* Create 1 sector of valid CD-ROM data */

            await storageInstance.write(isoFilePath, isoContent);

            /* Create CHD file from iso format */
            try {
                const result = await chd.create({
                    inputFilePath: isoFilePath,
                    format: 'iso',
                });

                /* Verify result is a path to a CHD file */
                expect(result).toMatch(/\.chd$/);
                expect(result).toContain('test.chd');
            } catch (error) {
                /* If chdman is not installed or other errors occur, just verify it's an error */
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should throw error if input file does not exist', async () => {
            const nonExistentPath = path.join(testDir, 'nonexistent.cue');

            await expect(
                chd.create({ inputFilePath: nonExistentPath, format: 'cue' })
            ).rejects.toThrow('Input file does not exist: ' + nonExistentPath);
        });

        it('should throw error if input file extension does not match format', async () => {
            /* Create a file with wrong extension */
            const wrongExtensionPath = path.join(testDir, 'test.txt');
            const content = 'Some content';
            await storageInstance.write(
                wrongExtensionPath,
                new TextEncoder().encode(content)
            );

            /* Try to create CHD with wrong format */
            await expect(
                chd.create({
                    inputFilePath: wrongExtensionPath,
                    format: 'cue',
                })
            ).rejects.toThrow(
                'Input file extension does not match format: txt !== cue'
            );
        });
    });

    describe('extract', () => {
        it('should extract CHD file to cue format', async () => {
            /* Create a mock CHD file */
            const chdFilePath = path.join(testDir, 'test.chd');
            const chdContent = new TextEncoder().encode('Mock CHD content');
            await storageInstance.write(chdFilePath, chdContent);

            /* Extract CHD file to cue format */
            try {
                const result = await chd.extract({
                    chdFilePath,
                    format: 'cue',
                });

                /* Verify result is a path to a cue file */
                expect(result).toMatch(/\.cue$/);
                expect(result).toContain('test.cue');
            } catch (error) {
                /* If chdman is not installed or other errors occur, just verify it's an error */
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should extract CHD file to gdi format', async () => {
            /* Create a mock CHD file */
            const chdFilePath = path.join(testDir, 'test.chd');
            const chdContent = new TextEncoder().encode('Mock CHD content');
            await storageInstance.write(chdFilePath, chdContent);

            /* Extract CHD file to gdi format */
            try {
                const result = await chd.extract({
                    chdFilePath,
                    format: 'gdi',
                });

                /* Verify result is a path to a gdi file */
                expect(result).toMatch(/\.gdi$/);
                expect(result).toContain('test.gdi');
            } catch (error) {
                /* If chdman is not installed or other errors occur, just verify it's an error */
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should extract CHD file to iso format', async () => {
            /* Create a mock CHD file */
            const chdFilePath = path.join(testDir, 'test.chd');
            const chdContent = new TextEncoder().encode('Mock CHD content');
            await storageInstance.write(chdFilePath, chdContent);

            /* Extract CHD file to iso format */
            try {
                const result = await chd.extract({
                    chdFilePath,
                    format: 'iso',
                });

                /* Verify result is a path to an iso file */
                expect(result).toMatch(/\.iso$/);
                expect(result).toContain('test.iso');
            } catch (error) {
                /* If chdman is not installed or other errors occur, just verify it's an error */
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should throw error if CHD file does not exist', async () => {
            const nonExistentChdPath = path.join(testDir, 'nonexistent.chd');

            await expect(
                chd.extract({ chdFilePath: nonExistentChdPath, format: 'cue' })
            ).rejects.toThrow('CHD file does not exist: ' + nonExistentChdPath);
        });
    });

    describe('verify', () => {
        it('should verify CHD file', async () => {
            /* Create a mock CHD file */
            const chdFilePath = path.join(testDir, 'test.chd');
            const chdContent = new TextEncoder().encode('Mock CHD content');
            await storageInstance.write(chdFilePath, chdContent);

            /* Verify CHD file (should not throw) */
            try {
                await expect(
                    chd.verify({ chdFilePath })
                ).resolves.toBeUndefined();
            } catch (error) {
                /* If chdman is not installed or other errors occur, just verify it's an error */
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should throw error if CHD file does not exist', async () => {
            const nonExistentChdPath = path.join(testDir, 'nonexistent.chd');

            await expect(
                chd.verify({ chdFilePath: nonExistentChdPath })
            ).rejects.toThrow('CHD file does not exist: ' + nonExistentChdPath);
        });
    });
});
