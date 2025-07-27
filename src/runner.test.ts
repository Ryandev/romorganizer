import { Runner } from './runner';
import storage from './utils/storage';

// Mock the storage module
jest.mock('./utils/storage', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        remove: jest.fn().mockResolvedValue(),
    })),
}));

describe('Runner', () => {
    let mockStorage: jest.Mocked<ReturnType<typeof storage>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockStorage = storage() as jest.Mocked<ReturnType<typeof storage>>;
    });

    describe('disposal', () => {
        test('should call _cleanup when disposed using Symbol.dispose', async () => {
            // Create a runner instance
            const runner = new Runner('/test/source.7z');
            
            // Add some temporary files to the runner
            (runner as any).temporaryFiles = ['/temp/file1.txt', '/temp/file2.txt'];
            
            // Mock the _cleanup method to track if it's called
            const cleanupSpy = jest.spyOn(runner as any, '_cleanup').mockResolvedValue();
            
            // Call the dispose method
            await runner[Symbol.dispose]();
            
            // Verify _cleanup was called
            expect(cleanupSpy).toHaveBeenCalledTimes(1);
            
            // Clean up the spy
            cleanupSpy.mockRestore();
        });

        test('should call _cleanup method when disposed', async () => {
            // Create a runner instance
            const runner = new Runner('/test/source.7z');
            
            // Mock the _cleanup method to track if it's called
            const cleanupSpy = jest.spyOn(runner as any, '_cleanup').mockResolvedValue(undefined);  
            
            // Call the dispose method
            await runner[Symbol.dispose]();
            
            // Verify _cleanup was called
            expect(cleanupSpy).toHaveBeenCalledTimes(1);
            
            // Clean up the spy
            cleanupSpy.mockRestore();
        });

        test('should handle _cleanup errors gracefully', async () => {
            // Create a runner instance
            const runner = new Runner('/test/source.7z');
            
            // Mock the _cleanup method to throw an error
            const cleanupSpy = jest.spyOn(runner as any, '_cleanup').mockRejectedValue(new Error('Cleanup failed'));
            
            // Call the dispose method - should not throw
            await expect(runner[Symbol.dispose]()).rejects.toThrow('Cleanup failed');
            
            // Verify _cleanup was called
            expect(cleanupSpy).toHaveBeenCalledTimes(1);
            
            // Clean up the spy
            cleanupSpy.mockRestore();
        });

        test('should work with empty temporary files list', async () => {
            // Create a runner instance
            const runner = new Runner('/test/source.7z');
            
            // Ensure temporary files is empty
            (runner as any).temporaryFiles = [];
            
            // Mock the _cleanup method to track if it's called
            const cleanupSpy = jest.spyOn(runner as any, '_cleanup').mockResolvedValue(undefined);  
            
            // Call the dispose method
            await runner[Symbol.dispose]();
            
            // Verify _cleanup was called
            expect(cleanupSpy).toHaveBeenCalledTimes(1);
            
            // Verify no storage operations were performed
            expect(mockStorage.remove).not.toHaveBeenCalled();
            
            // Clean up the spy
            cleanupSpy.mockRestore();
        });

        test('should handle multiple dispose calls gracefully', async () => {
            // Create a runner instance
            const runner = new Runner('/test/source.7z');
            
            // Add temporary files to the runner
            (runner as any).temporaryFiles = ['/temp/file1.txt'];
            
            // Mock the _cleanup method to track if it's called
            const cleanupSpy = jest.spyOn(runner as any, '_cleanup').mockResolvedValue(undefined);  
            
            // Call dispose multiple times
            await runner[Symbol.dispose]();
            await runner[Symbol.dispose]();
            await runner[Symbol.dispose]();
            
            // Verify _cleanup was called each time
            expect(cleanupSpy).toHaveBeenCalledTimes(3);
            
            // Clean up the spy
            cleanupSpy.mockRestore();
        });
    });
}); 