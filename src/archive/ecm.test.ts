import { join } from 'path';
import { EcmArchive } from './ecm';
import storage from '../utils/storage';

describe('EcmArchive', () => {
    let testDir: string;
    let storageInstance: Awaited<ReturnType<typeof storage>>;

    beforeAll(async () => {
        storageInstance = await storage();
        testDir = await storageInstance.createTemporaryDirectory();
    });

    afterAll(async () => {
        await storageInstance.remove(testDir);
    });

    afterEach(async () => {
        // Clean up any files created during tests
        const files = await storageInstance.list(testDir, { removePrefix: false });
        for (const file of files) {
            await storageInstance.remove(file);
        }
    });

    describe('constructor', () => {
        it('should create an EcmArchive instance', () => {
            const ecmArchive = new EcmArchive(join(testDir, 'test.ecm'));
            expect(ecmArchive).toBeInstanceOf(EcmArchive);
            expect(ecmArchive.archiveFile()).toBe(join(testDir, 'test.ecm'));
        });
    });

    describe('compress and extract cycle', () => {
        it('should compress and extract a simple text file', async () => {
            // Create a simple text file
            const originalContent = 'Hello, World! This is a test file for ECM compression.';
            const originalBuffer = new TextEncoder().encode(originalContent);
            const originalFilePath = join(testDir, 'original.txt');
            await storageInstance.write(originalFilePath, originalBuffer);

            // Create EcmArchive instance for compression
            const ecmArchive = new EcmArchive(join(testDir, 'test.ecm'));

            // Compress the file
            const compressedFilePath = await ecmArchive.compress(originalFilePath);
            expect(await storageInstance.exists(compressedFilePath)).toBe(true);

            // Create a new EcmArchive instance for the compressed file
            const compressedArchive = new EcmArchive(compressedFilePath);
            
            // Verify the compressed file
            const verifyResult = await compressedArchive.verify();
            expect(verifyResult).toBe(true);

            // Extract the compressed file
            const extractedFilePath = await compressedArchive.extract();
            expect(await storageInstance.exists(extractedFilePath)).toBe(true);

            // Compare original and extracted content
            const extractedContent = await storageInstance.read(extractedFilePath);
            const extractedText = new TextDecoder().decode(extractedContent);
            expect(extractedText).toBe(originalContent);
        });

        it('should compress and extract a binary file', async () => {
            // Create a binary file with various byte patterns
            const originalBuffer = Buffer.from([
                0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
                0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
                0xFF, 0xFE, 0xFD, 0xFC, 0xFB, 0xFA, 0xF9, 0xF8,
                0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF
            ]);
            const originalFilePath = join(testDir, 'original.bin');
            await storageInstance.write(originalFilePath, originalBuffer);

            // Create EcmArchive instance for compression
            const ecmArchive = new EcmArchive(join(testDir, 'test.ecm'));

            // Compress the file
            const compressedFilePath = await ecmArchive.compress(originalFilePath);
            expect(await storageInstance.exists(compressedFilePath)).toBe(true);

            // Create a new EcmArchive instance for the compressed file
            const compressedArchive = new EcmArchive(compressedFilePath);
            
            // Verify the compressed file
            const verifyResult = await compressedArchive.verify();
            expect(verifyResult).toBe(true);

            // Extract the compressed file
            const extractedFilePath = await compressedArchive.extract();
            expect(await storageInstance.exists(extractedFilePath)).toBe(true);

            // Compare original and extracted content
            const extractedContent = await storageInstance.read(extractedFilePath);
            expect(Buffer.from(extractedContent)).toEqual(Buffer.from(originalBuffer));
        });

        it('should compress and extract a large file', async () => {
            // Create a larger file with repeating patterns
            const chunk = 'This is a repeating pattern that should compress well. '.repeat(100);
            const originalContent = chunk + '\n' + chunk + '\n' + chunk;
            const originalBuffer = new TextEncoder().encode(originalContent);
            const originalFilePath = join(testDir, 'large.txt');
            await storageInstance.write(originalFilePath, originalBuffer);

            // Create EcmArchive instance for compression
            const ecmArchive = new EcmArchive(join(testDir, 'test.ecm'));

            // Compress the file
            const compressedFilePath = await ecmArchive.compress(originalFilePath);
            expect(await storageInstance.exists(compressedFilePath)).toBe(true);

            // Create a new EcmArchive instance for the compressed file
            const compressedArchive = new EcmArchive(compressedFilePath);
            
            // Verify the compressed file
            const verifyResult = await compressedArchive.verify();
            expect(verifyResult).toBe(true);

            // Extract the compressed file
            const extractedFilePath = await compressedArchive.extract();
            expect(await storageInstance.exists(extractedFilePath)).toBe(true);

            // Compare original and extracted content
            const extractedContent = await storageInstance.read(extractedFilePath);
            const extractedText = new TextDecoder().decode(extractedContent);
            expect(extractedText).toBe(originalContent);
        });

        it('should compress and extract a file with special characters', async () => {
            // Create a file with special characters and unicode
            const originalContent = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?/~`\n' +
                                  /* Cspell:disable-next-line */
                                  'Unicode: éñüçåßøæñüçåßøæñüçåßøæñüçåßøæ\n' +
                                  'Emojis: 🚀🎉💻📁🗜️🔧⚙️🎯🎪🎨🎭🎪🎨🎭🎪🎨🎭\n' +
                                  'Numbers: 1234567890\n' +
                                  'Mixed: AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';
            const originalBuffer = new TextEncoder().encode(originalContent);
            const originalFilePath = join(testDir, 'special.txt');
            await storageInstance.write(originalFilePath, originalBuffer);

            // Create EcmArchive instance for compression
            const ecmArchive = new EcmArchive(join(testDir, 'test.ecm'));

            // Compress the file
            const compressedFilePath = await ecmArchive.compress(originalFilePath);
            expect(await storageInstance.exists(compressedFilePath)).toBe(true);

            // Create a new EcmArchive instance for the compressed file
            const compressedArchive = new EcmArchive(compressedFilePath);
            
            // Verify the compressed file
            const verifyResult = await compressedArchive.verify();
            expect(verifyResult).toBe(true);

            // Extract the compressed file
            const extractedFilePath = await compressedArchive.extract();
            expect(await storageInstance.exists(extractedFilePath)).toBe(true);

            // Compare original and extracted content
            const extractedContent = await storageInstance.read(extractedFilePath);
            const extractedText = new TextDecoder().decode(extractedContent);
            expect(extractedText).toBe(originalContent);
        });

        it('should compress and extract a file with random data', async () => {
            // Create a file with random data
            const randomBytes = new Uint8Array(1024);
            for (let i = 0; i < randomBytes.length; i++) {
                randomBytes[i] = Math.floor(Math.random() * 256);
            }
            const originalFilePath = join(testDir, 'random.bin');
            await storageInstance.write(originalFilePath, randomBytes);

            // Create EcmArchive instance for compression
            const ecmArchive = new EcmArchive(join(testDir, 'test.ecm'));

            // Compress the file
            const compressedFilePath = await ecmArchive.compress(originalFilePath);
            expect(await storageInstance.exists(compressedFilePath)).toBe(true);

            // Create a new EcmArchive instance for the compressed file
            const compressedArchive = new EcmArchive(compressedFilePath);
            
            // Verify the compressed file
            const verifyResult = await compressedArchive.verify();
            expect(verifyResult).toBe(true);

            // Extract the compressed file
            const extractedFilePath = await compressedArchive.extract();
            expect(await storageInstance.exists(extractedFilePath)).toBe(true);

            // Compare original and extracted content
            const extractedContent = await storageInstance.read(extractedFilePath);
            expect(Buffer.from(extractedContent)).toEqual(Buffer.from(randomBytes));
        });
    });

    describe('verify', () => {
        it('should return false for non-existent file', async () => {
            const nonExistentArchive = new EcmArchive(join(testDir, 'non-existent.ecm'));
            const result = await nonExistentArchive.verify();
            expect(result).toBe(false);
        });

        it('should return false for invalid ECM file', async () => {
            // Create a file that's not a valid ECM file
            const invalidContent = 'This is not an ECM file';
            const invalidBuffer = new TextEncoder().encode(invalidContent);
            const invalidFilePath = join(testDir, 'invalid.ecm');
            await storageInstance.write(invalidFilePath, invalidBuffer);

            const invalidArchive = new EcmArchive(invalidFilePath);
            const result = await invalidArchive.verify();
            expect(result).toBe(false);
        });

        it('should return true for valid ECM file', async () => {
            // Create a valid ECM file by compressing a test file first
            const testContent = 'Test content for ECM verification';
            const testBuffer = new TextEncoder().encode(testContent);
            const testFilePath = join(testDir, 'test.txt');
            await storageInstance.write(testFilePath, testBuffer);

            // Create EcmArchive instance for compression
            const ecmArchive = new EcmArchive(join(testDir, 'test.ecm'));

            // Compress to create a valid ECM file
            const compressedFilePath = await ecmArchive.compress(testFilePath);
            expect(await storageInstance.exists(compressedFilePath)).toBe(true);
            
            // Create a new EcmArchive instance for verification
            const compressedArchive = new EcmArchive(compressedFilePath);
            
            // Verify the compressed file
            const result = await compressedArchive.verify();
            expect(result).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should handle compression errors gracefully', async () => {
            // Try to compress a non-existent file
            const nonExistentFile = join(testDir, 'non-existent.txt');
            const ecmArchive = new EcmArchive(join(testDir, 'test.ecm'));
            
            await expect(ecmArchive.compress(nonExistentFile)).rejects.toThrow();
        });

        it('should handle extraction errors gracefully', async () => {
            // Try to extract a non-existent ECM file
            const nonExistentArchive = new EcmArchive(join(testDir, 'non-existent.ecm'));
            
            await expect(nonExistentArchive.extract()).rejects.toThrow();
        });
    });
}); 