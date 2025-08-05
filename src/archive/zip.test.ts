import { createZipArchive } from './zip';
import path from 'node:path';
import storage from '../utils/storage';
import type { IStorage } from '../utils/storage.interface';

describe('createZipArchive', () => {
    let testDir: string;
    let zipArchive: ReturnType<typeof createZipArchive>;
    let storageInstance: IStorage;

    beforeEach(async () => {
        storageInstance = await storage();
        testDir = await storageInstance.createTemporaryDirectory();
        zipArchive = createZipArchive(path.join(testDir, 'test.zip'));
    });

    afterEach(async () => {
        await storageInstance.remove(testDir);
    });

    describe('factory function', () => {
        it('should create a ZipArchive instance', () => {
            expect(zipArchive).toBeDefined();
            expect(zipArchive.archiveFile()).toBe(path.join(testDir, 'test.zip'));
        });
    });

    describe('compress', () => {
        it('should compress a directory to a zip file', async () => {
            /* Create some test files */
            const testContent = 'Hello, World!';
            const testBuffer = new TextEncoder().encode(testContent);

            await storageInstance.write(path.join(testDir, 'test1.txt'), testBuffer);
            await storageInstance.write(path.join(testDir, 'test2.txt'), testBuffer);

            const zipPath = path.join(testDir, 'output.zip');
            const zipArchive = createZipArchive(zipPath);

            await zipArchive.compress(testDir);

            /* Verify the zip file was created */
            const exists = await storageInstance.exists(zipPath);
            expect(exists).toBe(true);

            /* Verify the zip file has content */
            const stats = await storageInstance.size(zipPath);
            expect(stats).toBeGreaterThan(0);
        });
    });

    describe('extract', () => {
        it('should extract a zip file to a directory', async () => {
            /* First create a zip file */
            const testContent = 'Hello, World!';
            const testBuffer = new TextEncoder().encode(testContent);

            await storageInstance.write(path.join(testDir, 'test1.txt'), testBuffer);
            await storageInstance.write(path.join(testDir, 'test2.txt'), testBuffer);

            const zipPath = path.join(testDir, 'test.zip');
            const zipArchive = createZipArchive(zipPath);

            await zipArchive.compress(testDir);

            /* Now extract it */
            const extractedDir = await zipArchive.extract();

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
        });
    });

    describe('verify', () => {
        it('should verify a valid zip file', async () => {
            /* Create a valid zip file */
            const testContent = 'Hello, World!';
            const testBuffer = new TextEncoder().encode(testContent);

            await storageInstance.write(path.join(testDir, 'test.txt'), testBuffer);

            const zipPath = path.join(testDir, 'test.zip');
            const zipArchive = createZipArchive(zipPath);

            await zipArchive.compress(testDir);

            /* Verify the zip file */
            const isValid = await zipArchive.verify();
            expect(isValid).toBe(true);
        });

        it('should return false for invalid zip file', async () => {
            const invalidZipPath = path.join(testDir, 'invalid.zip');
            const zipArchive = createZipArchive(invalidZipPath);

            const isValid = await zipArchive.verify();
            expect(isValid).toBe(false);
        });
    });
});
