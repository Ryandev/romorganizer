import storage from './storage';
import storageDecorator from './storage.decorator';

describe('storage.decorator', () => {
    describe('withCleanup', () => {
        it('should track temporary directories created by createTemporaryDirectory', async () => {
            const decoratedStorage = storageDecorator.withCleanup(storage());
            
            /* Create a temporary directory */
            const tempDir1 = await decoratedStorage.createTemporaryDirectory();
            const tempDir2 = await decoratedStorage.createTemporaryDirectory();
            
            /* Verify directories exist */
            expect(await decoratedStorage.exists(tempDir1)).toBe(true);
            expect(await decoratedStorage.exists(tempDir2)).toBe(true);
            
            /* Clean up */
            await (decoratedStorage as any).cleanup();
            
            /* Verify directories are removed */
            expect(await decoratedStorage.exists(tempDir1)).toBe(false);
            expect(await decoratedStorage.exists(tempDir2)).toBe(false);
        });
        
        it('should handle cleanup errors gracefully', async () => {
            const decoratedStorage = storageDecorator.withCleanup(storage());
            
            /* Create a temporary directory */
            const tempDir = await decoratedStorage.createTemporaryDirectory();
            
            /* Manually remove the directory to simulate it being deleted externally */
            await storage().remove(tempDir);
            
            /* Cleanup should not throw an error */
            await expect((decoratedStorage as any).cleanup()).resolves.not.toThrow();
        });
        
        it('should support Symbol.dispose for automatic cleanup', async () => {
            const decoratedStorage = storageDecorator.withCleanup(storage());
            
            /* Create a temporary directory */
            const tempDir = await decoratedStorage.createTemporaryDirectory();
            
            /* Verify directory exists */
            expect(await decoratedStorage.exists(tempDir)).toBe(true);
            
            /* Use Symbol.dispose for cleanup */
            await (decoratedStorage as any)[Symbol.dispose]();
            
            /* Verify directory is removed */
            expect(await decoratedStorage.exists(tempDir)).toBe(false);
        });
        
        it('should clear temporary directories list after cleanup', async () => {
            const decoratedStorage = storageDecorator.withCleanup(storage());
            
            /* Create temporary directories */
            await decoratedStorage.createTemporaryDirectory();
            await decoratedStorage.createTemporaryDirectory();
            
            /* Clean up */
            await (decoratedStorage as any).cleanup();
            
            /* Create another temporary directory */
            const tempDir3 = await decoratedStorage.createTemporaryDirectory();
            
            /* Clean up again - should only clean up tempDir3 */
            await (decoratedStorage as any).cleanup();
            
            /* Verify only tempDir3 was cleaned up */
            expect(await decoratedStorage.exists(tempDir3)).toBe(false);
        });
    });
}); 