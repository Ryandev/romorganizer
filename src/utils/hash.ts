import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/**
 * Calculate SHA1 hash of a file
 * @param filePath - Path to the file to hash
 * @returns Promise<string> - SHA1 hash as hexadecimal string
 */
export async function calculateFileSha1(filePath: string): Promise<string> {
    // Use Node.js fs.readFile directly for more reliable binary reading
    // This avoids potential issues with the storage abstraction's ArrayBuffer handling
    const buffer = await readFile(filePath);
    return createHash('sha1').update(buffer).digest('hex');
} 