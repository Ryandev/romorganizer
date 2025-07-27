import { ZipArchive } from './zip';
import { join } from 'node:path';
import storage from '../utils/storage';
import type { IStorage } from '../utils/storage';

describe('ZipArchive', () => {
    let testDir: string;
    let zipArchive: ZipArchive;
    let storageInstance: IStorage;

    beforeEach(async () => {
        storageInstance = await storage();
        testDir = await storageInstance.createTemporaryDirectory();
        zipArchive = new ZipArchive(join(testDir, 'test.zip'));

        // Initialize temporaryFiles for testing
        if (!globalThis.temporaryFiles) {
            globalThis.temporaryFiles = [];
        }
    });

    afterEach(async () => {
        await storageInstance.remove(testDir);
    });

    describe('constructor', () => {
        it('should create a ZipArchive instance', () => {
            expect(zipArchive).toBeInstanceOf(ZipArchive);
            expect(zipArchive.archiveFile()).toBe(join(testDir, 'test.zip'));
        });
    });

    describe('compress', () => {
        it('should compress a directory to a zip file', async () => {
            // Create some test files
            const testContent = 'Hello, World!';
            const testBuffer = new TextEncoder().encode(testContent);

            await storageInstance.write(join(testDir, 'test1.txt'), testBuffer);
            await storageInstance.write(join(testDir, 'test2.txt'), testBuffer);

            const zipPath = join(testDir, 'output.zip');
            const zipArchive = new ZipArchive(zipPath);

            await zipArchive.compress(testDir);

            // Verify the zip file was created
            const exists = await storageInstance.exists(zipPath);
            expect(exists).toBe(true);

            // Verify the zip file has content
            const stats = await storageInstance.size(zipPath);
            expect(stats).toBeGreaterThan(0);
        });
    });

    describe('extract', () => {
        it('should extract a zip file to a directory', async () => {
            // First create a zip file
            const testContent = 'Hello, World!';
            const testBuffer = new TextEncoder().encode(testContent);

            await storageInstance.write(join(testDir, 'test1.txt'), testBuffer);
            await storageInstance.write(join(testDir, 'test2.txt'), testBuffer);

            const zipPath = join(testDir, 'test.zip');
            const zipArchive = new ZipArchive(zipPath);

            await zipArchive.compress(testDir);

            // Now extract it
            const extractedDir = await zipArchive.extract();

            // Verify the extracted directory exists
            const exists = await storageInstance.exists(extractedDir);
            expect(exists).toBe(true);

            // Verify the files were extracted
            const files = await storageInstance.list(extractedDir, {
                recursive: false,
            });
            expect(files.length).toBeGreaterThan(0);

            // Clean up
            await storageInstance.remove(extractedDir);
        });
    });

    describe('verify', () => {
        it('should verify a valid zip file', async () => {
            // Create a valid zip file
            const testContent = 'Hello, World!';
            const testBuffer = new TextEncoder().encode(testContent);

            await storageInstance.write(join(testDir, 'test.txt'), testBuffer);

            const zipPath = join(testDir, 'test.zip');
            const zipArchive = new ZipArchive(zipPath);

            await zipArchive.compress(testDir);

            // Verify the zip file
            const isValid = await zipArchive.verify();
            expect(isValid).toBe(true);
        });

        it('should return false for an invalid zip file', async () => {
            // Create an invalid zip file (just a text file)
            const testContent = 'This is not a zip file';
            const testBuffer = new TextEncoder().encode(testContent);

            const invalidZipPath = join(testDir, 'invalid.zip');
            await storageInstance.write(invalidZipPath, testBuffer);

            const zipArchive = new ZipArchive(invalidZipPath);

            // Verify the invalid zip file
            const isValid = await zipArchive.verify();
            expect(isValid).toBe(false);
        });
    });
});
