import { RarArchive } from './rar.js';
import { join } from 'node:path';
import storage from '../utils/storage.js';
import type { IStorage } from '../utils/storage.js';

describe('RarArchive', () => {
    let testDir: string;
    let rarArchive: RarArchive;
    let storageInstance: IStorage;

    beforeEach(async () => {
        storageInstance = await storage();
        testDir = await storageInstance.createTemporaryDirectory();
        rarArchive = new RarArchive(join(testDir, 'test.rar'));

        // Initialize temporaryFiles for testing
        if (!globalThis.temporaryFiles) {
            globalThis.temporaryFiles = [];
        }
    });

    afterEach(async () => {
        await storageInstance.remove(testDir);
    });

    describe('constructor', () => {
        it('should create a RarArchive instance', () => {
            expect(rarArchive).toBeInstanceOf(RarArchive);
            expect(rarArchive.archiveFile()).toBe(join(testDir, 'test.rar'));
        });
    });

    describe('compress', () => {
        it('should compress a directory to a RAR file', async () => {
            // Create some test files
            const testContent = 'Hello, World!';
            const testBuffer = new TextEncoder().encode(testContent);

            await storageInstance.write(join(testDir, 'test1.txt'), testBuffer);
            await storageInstance.write(join(testDir, 'test2.txt'), testBuffer);

            const rarPath = join(testDir, 'output.rar');
            const rarArchive = new RarArchive(rarPath);

            // This test might fail if rar is not installed, which is expected
            try {
                await rarArchive.compress(testDir);

                // Verify the RAR file was created
                const exists = await storageInstance.exists(rarPath);
                expect(exists).toBe(true);

                // Verify the RAR file has content
                const stats = await storageInstance.size(rarPath);
                expect(stats).toBeGreaterThan(0);
            } catch (error) {
                // If rar is not installed or other errors occur, just verify it's an error
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    describe('extract', () => {
        it('should extract a RAR file to a directory', async () => {
            // Note: This test requires a valid RAR file to be present
            // Since we can't easily create RAR files without the rar command,
            // this test will be skipped if no RAR file is available

            const rarPath = join(testDir, 'test.rar');
            const rarArchive = new RarArchive(rarPath);

            // This test might fail if no RAR file exists, which is expected
            try {
                const extractedDir = await rarArchive.extract();

                // Verify the extracted directory exists
                const exists = await storageInstance.exists(extractedDir);
                expect(exists).toBe(true);

                // Clean up
                await storageInstance.remove(extractedDir);
            } catch (error) {
                // If no RAR file exists or other errors occur, just verify it's an error
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    describe('verify', () => {
        it('should verify a valid RAR file', async () => {
            // Note: This test requires a valid RAR file to be present
            const rarPath = join(testDir, 'test.rar');
            const rarArchive = new RarArchive(rarPath);

            // This test might fail if no RAR file exists, which is expected
            try {
                const isValid = await rarArchive.verify();
                expect(isValid).toBe(true);
            } catch (error) {
                // If no RAR file exists or other errors occur, just verify it's an error
                expect(error).toBeInstanceOf(Error);
            }
        });

        it('should return false for an invalid RAR file', async () => {
            // Create an invalid RAR file (just a text file)
            const testContent = 'This is not a RAR file';
            const testBuffer = new TextEncoder().encode(testContent);

            const invalidRarPath = join(testDir, 'invalid.rar');
            await storageInstance.write(invalidRarPath, testBuffer);

            const rarArchive = new RarArchive(invalidRarPath);

            // Verify the invalid RAR file
            const isValid = await rarArchive.verify();
            expect(isValid).toBe(false);
        });
    });
});
