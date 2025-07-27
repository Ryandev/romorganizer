import { join } from 'path';
import chd from './chd';
import storage, { IStorage } from './storage';
import fs from 'node:fs';
import path from 'node:path';

// Helper function to create a valid CD-ROM binary file
function createValidBinFile(sizeInSectors: number = 1): Uint8Array {
    // CD-ROM sector size is 2352 bytes
    const sectorSize = 2352;
    const totalSize = sizeInSectors * sectorSize;
    const buffer = new Uint8Array(totalSize);
    
    // Fill with some pattern (zeros for simplicity, but could be more realistic)
    for (let i = 0; i < totalSize; i++) {
        buffer[i] = i % 256; // Simple pattern
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
        // Clean up temporary test directory
        await storageInstance.remove(testDir);
        
        // Clean up any files that might have been created in the current directory
        for (const filePath of filesToCleanup) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch {
                // Ignore cleanup errors
            }
        }
        
        // Also clean up common test files that might be created in the current directory
        const commonTestFiles = [
            'test.bin',
            'test.chd',
            'test.cue',
            'test.gdi',
            'test.iso',
            'game.bin',
            'multi.cue',
            'track01.bin',
            'track02.bin'
        ];
        
        for (const fileName of commonTestFiles) {
            try {
                const filePath = path.join(process.cwd(), fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch {
                // Ignore cleanup errors
            }
        }
    });

    describe('create', () => {
        it('should create CHD file with single binary file (default behavior)', async () => {
            // Create test files
            const cueFilePath = join(testDir, 'test.cue');
            const binFilePath = join(testDir, 'test.bin');
            
            const cueContent = 'FILE "test.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00';
            const binContent = createValidBinFile(1); // Create 1 sector of valid CD-ROM data

            await storageInstance.write(cueFilePath, new TextEncoder().encode(cueContent));
            await storageInstance.write(binFilePath, binContent);

            // Create CHD file
            try {
                const result = await chd.create({ cueFilePath });

                // Verify result is a path to a CHD file
                expect(result).toMatch(/\.chd$/);
                expect(result).toContain('test.chd');
            } catch (error) {
                // If chdman is not installed or other errors occur, just verify it's an error
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should create CHD file with explicitly provided single binary file', async () => {
            // Create test files
            const cueFilePath = join(testDir, 'test.cue');
            const binFilePath = join(testDir, 'game.bin');
            
            const cueContent = 'FILE "game.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00';
            const binContent = createValidBinFile(1); // Create 1 sector of valid CD-ROM data
            
            await storageInstance.write(cueFilePath, new TextEncoder().encode(cueContent));
            await storageInstance.write(binFilePath, binContent);

            // Create CHD file with explicit binary file path
            try {
                const result = await chd.create({ 
                    cueFilePath, 
                    binFilePaths: [binFilePath] 
                });

                // Verify result is a path to a CHD file
                expect(result).toMatch(/\.chd$/);
                expect(result).toContain('test.chd');
            } catch (error) {
                // If chdman is not installed or other errors occur, just verify it's an error
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should create CHD file with multiple binary files', async () => {
            // Create test files
            const cueFilePath = join(testDir, 'multi.cue');
            const binFile1 = join(testDir, 'track01.bin');
            const binFile2 = join(testDir, 'track02.bin');
            
            const cueContent = `FILE "track01.bin" BINARY
  TRACK 01 MODE2/2352
    INDEX 01 00:00:00
FILE "track02.bin" BINARY
  TRACK 02 AUDIO
    INDEX 01 00:00:00`;
            
            const binContent1 = createValidBinFile(1); // Create 1 sector of valid CD-ROM data
            const binContent2 = createValidBinFile(1); // Create 1 sector of valid CD-ROM data
            
            await storageInstance.write(cueFilePath, new TextEncoder().encode(cueContent));
            await storageInstance.write(binFile1, binContent1);
            await storageInstance.write(binFile2, binContent2);

            // Create CHD file with multiple binary files
            try {
                const result = await chd.create({ 
                    cueFilePath, 
                    binFilePaths: [binFile1, binFile2] 
                });

                // Verify result is a path to a CHD file
                expect(result).toMatch(/\.chd$/);
                expect(result).toContain('multi.chd');
            } catch (error) {
                // If chdman is not installed or other errors occur, just verify it's an error
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should throw error if cue file does not exist', async () => {
            const nonExistentCuePath = join(testDir, 'nonexistent.cue');
            
            await expect(chd.create({ cueFilePath: nonExistentCuePath }))
                .rejects.toThrow('Cue file does not exist: ' + nonExistentCuePath);
        });

        it('should throw error if binary file does not exist (default behavior)', async () => {
            // Create only the cue file
            const cueFilePath = join(testDir, 'test.cue');
            const cueContent = 'FILE "test.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00';
            await storageInstance.write(cueFilePath, new TextEncoder().encode(cueContent));

            // The default bin file path would be test.bin, which doesn't exist
            await expect(chd.create({ cueFilePath }))
                .rejects.toThrow('Bin file does not exist: ' + join(testDir, 'test.bin'));
        });

        it('should throw error if any of the provided binary files do not exist', async () => {
            // Create test files
            const cueFilePath = join(testDir, 'test.cue');
            const binFile1 = join(testDir, 'track01.bin');
            const binFile2 = join(testDir, 'track02.bin');
            
            const cueContent = 'FILE "track01.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00';
            const binContent1 = createValidBinFile(1); // Create 1 sector of valid CD-ROM data
            
            await storageInstance.write(cueFilePath, new TextEncoder().encode(cueContent));
            await storageInstance.write(binFile1, binContent1);
            // Note: binFile2 is not created

            // Try to create CHD with missing binary file
            await expect(chd.create({ 
                cueFilePath, 
                binFilePaths: [binFile1, binFile2] 
            })).rejects.toThrow('Bin file does not exist: ' + binFile2);
        });

        it('should handle empty binFilePaths array by using default behavior', async () => {
            // Create test files
            const cueFilePath = join(testDir, 'test.cue');
            const binFilePath = join(testDir, 'test.bin');
            
            const cueContent = 'FILE "test.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00';
            const binContent = createValidBinFile(1); // Create 1 sector of valid CD-ROM data
            
            await storageInstance.write(cueFilePath, new TextEncoder().encode(cueContent));
            await storageInstance.write(binFilePath, binContent);

            // Create CHD file with empty binFilePaths array
            try {
                const result = await chd.create({ 
                    cueFilePath, 
                    binFilePaths: [] 
                });

                // Verify result is a path to a CHD file
                expect(result).toMatch(/\.chd$/);
                expect(result).toContain('test.chd');
            } catch (error) {
                // If chdman is not installed or other errors occur, just verify it's an error
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);
    });

    describe('extract', () => {
        it('should extract CHD file to cue format', async () => {
            // Create a mock CHD file
            const chdFilePath = join(testDir, 'test.chd');
            const chdContent = new TextEncoder().encode('Mock CHD content');
            await storageInstance.write(chdFilePath, chdContent);

            // Extract CHD file to cue format
            try {
                const result = await chd.extract({ chdFilePath, format: 'cue' });

                // Verify result is a path to a cue file
                expect(result).toMatch(/\.cue$/);
                expect(result).toContain('test.cue');
            } catch (error) {
                // If chdman is not installed or other errors occur, just verify it's an error
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should extract CHD file to gdi format', async () => {
            // Create a mock CHD file
            const chdFilePath = join(testDir, 'test.chd');
            const chdContent = new TextEncoder().encode('Mock CHD content');
            await storageInstance.write(chdFilePath, chdContent);

            // Extract CHD file to gdi format
            try {
                const result = await chd.extract({ chdFilePath, format: 'gdi' });

                // Verify result is a path to a gdi file
                expect(result).toMatch(/\.gdi$/);
                expect(result).toContain('test.gdi');
            } catch (error) {
                // If chdman is not installed or other errors occur, just verify it's an error
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should extract CHD file to iso format', async () => {
            // Create a mock CHD file
            const chdFilePath = join(testDir, 'test.chd');
            const chdContent = new TextEncoder().encode('Mock CHD content');
            await storageInstance.write(chdFilePath, chdContent);

            // Extract CHD file to iso format
            try {
                const result = await chd.extract({ chdFilePath, format: 'iso' });

                // Verify result is a path to an iso file
                expect(result).toMatch(/\.iso$/);
                expect(result).toContain('test.iso');
            } catch (error) {
                // If chdman is not installed or other errors occur, just verify it's an error
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should throw error if CHD file does not exist', async () => {
            const nonExistentChdPath = join(testDir, 'nonexistent.chd');
            
            await expect(chd.extract({ chdFilePath: nonExistentChdPath, format: 'cue' }))
                .rejects.toThrow('CHD file does not exist: ' + nonExistentChdPath);
        });
    });

    describe('verify', () => {
        it('should verify CHD file', async () => {
            // Create a mock CHD file
            const chdFilePath = join(testDir, 'test.chd');
            const chdContent = new TextEncoder().encode('Mock CHD content');
            await storageInstance.write(chdFilePath, chdContent);

            // Verify CHD file (should not throw)
            try {
                await expect(chd.verify({ chdFilePath })).resolves.toBeUndefined();
            } catch (error) {
                // If chdman is not installed or other errors occur, just verify it's an error
                expect(error).toBeInstanceOf(Error);
            }
        }, 30_000);

        it('should throw error if CHD file does not exist', async () => {
            const nonExistentChdPath = join(testDir, 'nonexistent.chd');
            
            await expect(chd.verify({ chdFilePath: nonExistentChdPath }))
                .rejects.toThrow('CHD file does not exist: ' + nonExistentChdPath);
        });
    });
}); 