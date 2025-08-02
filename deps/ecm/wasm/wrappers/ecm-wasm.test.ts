import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtemp } from 'fs/promises';
import { EcmWasm } from './ecm-wasm.js';

describe('ECM WASM Wrapper', () => {
  let tempDir: string;
  let ecmWasm: EcmWasm;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ecm-wasm-test-'));
    ecmWasm = new EcmWasm();
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      /* Ignore cleanup errors */
    }
  });

  describe('compress', () => {
    it('should compress a text file to ECM format', async () => {
      const inputPath = join(tempDir, 'test.txt');
      const outputPath = join(tempDir, 'test.ecm');
      
      /* Create a test file */
      const testContent = 'This is a test file for ECM compression.';
      await writeFile(inputPath, testContent);

      /* Compress the file */
      await ecmWasm.compress(inputPath, outputPath);

      /* Verify the output file exists and has content */
      const outputStats = await readFile(outputPath);
      expect(outputStats.length).toBeGreaterThan(0);
    });

    it('should compress a binary file to ECM format', async () => {
      const inputPath = join(tempDir, 'test.bin');
      const outputPath = join(tempDir, 'test.ecm');
      
      /* Create a binary test file */
      const testContent = new Uint8Array(1024);
      for (let i = 0; i < testContent.length; i++) {
        testContent[i] = i % 256;
      }
      await writeFile(inputPath, testContent);

      /* Compress the file */
      await ecmWasm.compress(inputPath, outputPath);

      /* Verify the output file exists and has content */
      const outputStats = await readFile(outputPath);
      expect(outputStats.length).toBeGreaterThan(0);
    });

    it('should handle large files', async () => {
      const inputPath = join(tempDir, 'large.bin');
      const outputPath = join(tempDir, 'large.ecm');
      
      /* Create a large test file (1MB) */
      const testContent = new Uint8Array(1024 * 1024);
      for (let i = 0; i < testContent.length; i++) {
        testContent[i] = i % 256;
      }
      await writeFile(inputPath, testContent);

      /* Compress the file */
      await ecmWasm.compress(inputPath, outputPath);

      /* Verify the output file exists and has content */
      const outputStats = await readFile(outputPath);
      expect(outputStats.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent input file', async () => {
      const inputPath = join(tempDir, 'nonexistent.txt');
      const outputPath = join(tempDir, 'test.ecm');

      await expect(ecmWasm.compress(inputPath, outputPath)).rejects.toThrow();
    });
  });

  describe('extract', () => {
    it('should extract an ECM file back to original format', async () => {
      const originalPath = join(tempDir, 'original.txt');
      const ecmPath = join(tempDir, 'test.ecm');
      const extractedPath = join(tempDir, 'extracted.txt');
      
      /* Create original file */
      const originalContent = 'This is the original content that will be compressed and then extracted.';
      await writeFile(originalPath, originalContent);

      /* Compress to ECM */
      await ecmWasm.compress(originalPath, ecmPath);

      /* Extract from ECM */
      await ecmWasm.extract(ecmPath, extractedPath);

      /* Verify the extracted content matches the original */
      const extractedContent = await readFile(extractedPath, 'utf8');
      expect(extractedContent).toBe(originalContent);
    });

    it('should extract binary ECM files correctly', async () => {
      const originalPath = join(tempDir, 'original.bin');
      const ecmPath = join(tempDir, 'test.ecm');
      const extractedPath = join(tempDir, 'extracted.bin');
      
      /* Create original binary file */
      const originalContent = new Uint8Array(2048);
      for (let i = 0; i < originalContent.length; i++) {
        originalContent[i] = i % 256;
      }
      await writeFile(originalPath, originalContent);

      /* Compress to ECM */
      await ecmWasm.compress(originalPath, ecmPath);

      /* Extract from ECM */
      await ecmWasm.extract(ecmPath, extractedPath);

      /* Verify the extracted content matches the original */
      const extractedContent = await readFile(extractedPath);
      expect(Buffer.from(extractedContent)).toEqual(Buffer.from(originalContent));
    });

    it('should throw error for non-existent ECM file', async () => {
      const inputPath = join(tempDir, 'nonexistent.ecm');
      const outputPath = join(tempDir, 'extracted.txt');

      await expect(ecmWasm.extract(inputPath, outputPath)).rejects.toThrow();
    });
  });

  describe('verify', () => {
    it('should verify a valid ECM file', async () => {
      const originalPath = join(tempDir, 'original.txt');
      const ecmPath = join(tempDir, 'test.ecm');
      
      /* Create original file and compress it */
      const originalContent = 'Test content for verification.';
      await writeFile(originalPath, originalContent);
      await ecmWasm.compress(originalPath, ecmPath);

      /* Verify the ECM file */
      const isValid = await ecmWasm.verify(ecmPath);
      expect(isValid).toBe(true);
    });

    it('should reject invalid files', async () => {
      const invalidPath = join(tempDir, 'invalid.txt');
      
      /* Create a non-ECM file */
      await writeFile(invalidPath, 'This is not an ECM file.');

      /* Verify should return false for invalid files */
      const isValid = await ecmWasm.verify(invalidPath);
      expect(isValid).toBe(false);
    });

    it('should handle non-existent files', async () => {
      const nonexistentPath = join(tempDir, 'nonexistent.ecm');

      /* Verify should return false for non-existent files */
      const isValid = await ecmWasm.verify(nonexistentPath);
      expect(isValid).toBe(false);
    });
  });

  describe('round-trip compression and extraction', () => {
    it('should maintain data integrity through compress/extract cycle', async () => {
      const originalPath = join(tempDir, 'original.dat');
      const ecmPath = join(tempDir, 'compressed.ecm');
      const extractedPath = join(tempDir, 'extracted.dat');
      
      /* Create original data with various patterns */
      const originalContent = new Uint8Array(4096);
      for (let i = 0; i < originalContent.length; i++) {
        /* Create some patterns for better compression testing */
        originalContent[i] = (i * 7 + i % 256) % 256;
      }
      await writeFile(originalPath, originalContent);

      /* Compress */
      await ecmWasm.compress(originalPath, ecmPath);

      /* Extract */
      await ecmWasm.extract(ecmPath, extractedPath);

      /* Compare original and extracted */
      const extractedContent = await readFile(extractedPath);
      expect(Buffer.from(extractedContent)).toEqual(Buffer.from(originalContent));
    });

    it('should handle files with special characters in names', async () => {
      const originalPath = join(tempDir, 'test file with spaces.txt');
      const ecmPath = join(tempDir, 'compressed file.ecm');
      const extractedPath = join(tempDir, 'extracted file.txt');
      
      const originalContent = 'Content with special characters: !@#$%^&*()';
      await writeFile(originalPath, originalContent);

      /* Compress */
      await ecmWasm.compress(originalPath, ecmPath);

      /* Extract */
      await ecmWasm.extract(ecmPath, extractedPath);

      /* Compare */
      const extractedContent = await readFile(extractedPath, 'utf8');
      expect(extractedContent).toBe(originalContent);
    });
  });
}); 