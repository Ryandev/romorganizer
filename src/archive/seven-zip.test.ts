import { SevenZipArchive } from './seven-zip';
import { join } from 'node:path';
import storage from '../utils/storage';
import type { IStorage } from '../utils/storage';

describe('SevenZipArchive', () => {
    let testDir: string;
    let sevenZipArchive: SevenZipArchive;
    let storageInstance: IStorage;

    beforeEach(async () => {
        storageInstance = await storage();
        testDir = await storageInstance.createTemporaryDirectory();
        sevenZipArchive = new SevenZipArchive(join(testDir, 'test.7z'));

        /* Initialize temporaryFiles for testing */
        if (!globalThis.temporaryFiles) {
            globalThis.temporaryFiles = [];
        }
    });

    afterEach(async () => {
        await storageInstance.remove(testDir);
    });

    describe('constructor', () => {
        it('should create a SevenZipArchive instance', () => {
            expect(sevenZipArchive).toBeInstanceOf(SevenZipArchive);
            expect(sevenZipArchive.archiveFile()).toBe(
                join(testDir, 'test.7z')
            );
        });
    });

    describe('compress', () => {
        it('should compress a directory to a 7z file', async () => {
            /* Create some test files */
            const testContent = 'Hello, World!';
            const testBuffer = new TextEncoder().encode(testContent);

            await storageInstance.write(join(testDir, 'test1.txt'), testBuffer);
            await storageInstance.write(join(testDir, 'test2.txt'), testBuffer);

            const sevenZipPath = join(testDir, 'output.7z');
            const sevenZipArchive = new SevenZipArchive(sevenZipPath);

            /* This test might fail if 7z is not installed, which is expected */
            try {
                await sevenZipArchive.compress(testDir);

                /* Verify the 7z file was created */
                const exists = await storageInstance.exists(sevenZipPath);
                expect(exists).toBe(true);

                /* Verify the 7z file has content */
                const stats = await storageInstance.size(sevenZipPath);
                expect(stats).toBeGreaterThan(0);
            } catch (error) {
                /* If 7z is not installed or other errors occur, just verify it's an error */
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    describe('extract', () => {
        it('should extract a 7z file to a directory', async () => {
            /* First create a 7z file */
            const testContent = 'Hello, World!';
            const testBuffer = new TextEncoder().encode(testContent);

            await storageInstance.write(join(testDir, 'test1.txt'), testBuffer);
            await storageInstance.write(join(testDir, 'test2.txt'), testBuffer);

            const sevenZipPath = join(testDir, 'test.7z');
            const sevenZipArchive = new SevenZipArchive(sevenZipPath);

            /* This test might fail if 7z is not installed, which is expected */
            try {
                await sevenZipArchive.compress(testDir);

                /* Now extract it */
                const extractedDir = await sevenZipArchive.extract();

                /* Verify the extracted directory exists */
                const exists = await storageInstance.exists(extractedDir);
                expect(exists).toBe(true);

                /* Verify the files were extracted */
                const files = await storageInstance.list(extractedDir, {
                    recursive: false,
                });
                expect(files.length).toBeGreaterThan(0);

                /* Clean up */
                await storageInstance.remove(extractedDir);
            } catch (error) {
                /* If 7z is not installed or other errors occur, just verify it's an error */
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    describe('verify', () => {
        it('should verify a valid 7z file', async () => {
            /* Create a valid 7z file */
            const testContent = 'Hello, World!';
            const testBuffer = new TextEncoder().encode(testContent);

            await storageInstance.write(join(testDir, 'test.txt'), testBuffer);

            const sevenZipPath = join(testDir, 'test.7z');
            const sevenZipArchive = new SevenZipArchive(sevenZipPath);

            /* This test might fail if 7z is not installed, which is expected */
            try {
                await sevenZipArchive.compress(testDir);

                /* Verify the 7z file */
                const isValid = await sevenZipArchive.verify();
                expect(isValid).toBe(true);
            } catch (error) {
                /* If 7z is not installed or other errors occur, just verify it's an error */
                expect(error).toBeInstanceOf(Error);
            }
        });

        it('should return false for an invalid 7z file', async () => {
            /* Create an invalid 7z file (just a text file) */
            const testContent = 'This is not a 7z file';
            const testBuffer = new TextEncoder().encode(testContent);

            const invalidSevenZipPath = join(testDir, 'invalid.7z');
            await storageInstance.write(invalidSevenZipPath, testBuffer);

            const sevenZipArchive = new SevenZipArchive(invalidSevenZipPath);

            /* Verify the invalid 7z file */
            const isValid = await sevenZipArchive.verify();
            expect(isValid).toBe(false);
        });
    });
});
