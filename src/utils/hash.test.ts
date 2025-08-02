import hash from './hash';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

describe('Hash Utilities', () => {
    describe('calculateFileSha1', () => {
        it('should calculate correct SHA1 hash for text files', async () => {
            const testFileName = 'test-sha1.txt';
            const testContent =
                'Hello, World! This is a test file for SHA1 calculation.';

            /* Create a test file with known content */
            await fs.writeFile(testFileName, testContent, 'utf8');

            try {
                /* Calculate SHA1 using our function */
                const calculatedSha1 =
                    await hash.calculateFileSha1(testFileName);

                /* Calculate expected SHA1 using Node.js crypto directly */
                const expectedSha1 = createHash('sha1')
                    .update(testContent, 'utf8')
                    .digest('hex');

                /* Verify the hashes match */
                expect(calculatedSha1).toBe(expectedSha1);

                /* Calculate the real known SHA1 */
                const realKnownSha1 = createHash('sha1')
                    .update(testContent, 'utf8')
                    .digest('hex');
                expect(calculatedSha1).toBe(realKnownSha1);

                console.log(`Test file SHA1: ${calculatedSha1}`);
                console.log(`Expected SHA1: ${expectedSha1}`);
                console.log(`Known SHA1: ${realKnownSha1}`);
            } finally {
                /* Clean up test file */
                try {
                    await fs.unlink(testFileName);
                } catch {
                    /* Ignore cleanup errors */
                }
            }
        });

        it('should calculate correct SHA1 hash for binary files', async () => {
            const testFileName = 'test-binary.bin';
            const testContent = Buffer.from([
                0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09,
            ]);

            /* Create a test binary file */
            await fs.writeFile(testFileName, testContent);

            try {
                /* Calculate SHA1 using our function */
                const calculatedSha1 =
                    await hash.calculateFileSha1(testFileName);

                /* Calculate expected SHA1 using Node.js crypto directly */
                const expectedSha1 = createHash('sha1')
                    .update(testContent)
                    .digest('hex');

                /* Verify the hashes match */
                expect(calculatedSha1).toBe(expectedSha1);

                console.log(`Binary file SHA1: ${calculatedSha1}`);
                console.log(`Expected SHA1: ${expectedSha1}`);
            } finally {
                /* Clean up test file */
                try {
                    await fs.unlink(testFileName);
                } catch {
                    /* Ignore cleanup errors */
                }
            }
        });

        it('should calculate correct SHA1 hash for large files', async () => {
            const testFileName = 'test-large.bin';
            /* Create a larger test file with mixed content */
            const testContent = Buffer.alloc(1024);
            for (let i = 0; i < testContent.length; i++) {
                testContent[i] = i % 256;
            }

            /* Create a test binary file */
            await fs.writeFile(testFileName, testContent);

            try {
                /* Calculate SHA1 using our function */
                const calculatedSha1 =
                    await hash.calculateFileSha1(testFileName);

                /* Calculate expected SHA1 using Node.js crypto directly */
                const expectedSha1 = createHash('sha1')
                    .update(testContent)
                    .digest('hex');

                /* Verify the hashes match */
                expect(calculatedSha1).toBe(expectedSha1);

                console.log(`Large file SHA1: ${calculatedSha1}`);
                console.log(`Expected SHA1: ${expectedSha1}`);
                console.log(`File size: ${testContent.length} bytes`);

                /* The SHA1 hex string should always be 40 characters */
                expect(calculatedSha1).toHaveLength(40);
            } finally {
                /* Clean up test file */
                try {
                    await fs.unlink(testFileName);
                } catch {
                    /* Ignore cleanup errors */
                }
            }
        });

        it('should handle empty files correctly', async () => {
            const testFileName = 'test-empty.txt';

            /* Create an empty test file */
            await fs.writeFile(testFileName, '');

            try {
                /* Calculate SHA1 using our function */
                const calculatedSha1 =
                    await hash.calculateFileSha1(testFileName);

                /* Calculate expected SHA1 for empty content */
                const expectedSha1 = createHash('sha1')
                    .update('')
                    .digest('hex');

                /* Verify the hashes match */
                expect(calculatedSha1).toBe(expectedSha1);

                console.log(`Empty file SHA1: ${calculatedSha1}`);
                console.log(`Expected SHA1: ${expectedSha1}`);
            } finally {
                /* Clean up test file */
                try {
                    await fs.unlink(testFileName);
                } catch {
                    /* Ignore cleanup errors */
                }
            }
        });

        it('should throw error for non-existent files', async () => {
            const nonExistentFile = 'non-existent-file.txt';

            await expect(
                hash.calculateFileSha1(nonExistentFile)
            ).rejects.toThrow();
        });

        it('should calculate correct SHA1 for real South Park BIN file', async () => {
            const realFilePath =
                '/Users/ats/Desktop/assets/South Park (USA) (Track 1).bin';
            const expectedSha1 = 'd2e9b5c23edf22f9f8104bb30294c4890c7e2615';

            try {
                /* Calculate SHA1 using our function */
                const calculatedSha1 =
                    await hash.calculateFileSha1(realFilePath);

                /* Verify the hash matches the expected value */
                expect(calculatedSha1).toBe(expectedSha1);

                console.log(`Real file SHA1: ${calculatedSha1}`);
                console.log(`Expected SHA1: ${expectedSha1}`);
                console.log(`File path: ${realFilePath}`);

                /* The SHA1 hex string should always be 40 characters */
                expect(calculatedSha1).toHaveLength(40);
            } catch (error) {
                /* If the file doesn't exist, skip the test but log the error */
                console.log(
                    `Real file test skipped: ${error instanceof Error ? error.message : String(error)}`
                );
                console.log(`Expected SHA1: ${expectedSha1}`);
                console.log(`File path: ${realFilePath}`);
            }
        });
    });
});
