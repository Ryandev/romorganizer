import { IStorage } from './storage.interface';
import { log } from './logger';

/* Decorate to add auto deletion of temporary files from createTemporaryDirectory when object is deallocated */
function withCleanup(
    storage: IStorage
): IStorage & { cleanup: () => Promise<void> } {
    const temporaryDirectories: string[] = [];

    /* Override createTemporaryDirectory to track created directories */
    const originalCreateTemporaryDirectory = storage.createTemporaryDirectory;

    const decoratedStorage: IStorage = {
        ...storage,
        createTemporaryDirectory: async () => {
            const tempDir = await originalCreateTemporaryDirectory();
            temporaryDirectories.push(tempDir);
            return tempDir;
        },
    };

    /* Add cleanup method to the decorated storage */
    const cleanup = async (): Promise<void> => {
        for (const tempDir of temporaryDirectories) {
            try {
                await storage.remove(tempDir);
                log.info(`Cleaned up temporary directory: ${tempDir}`);
            } catch (error) {
                log.warn(
                    `Failed to clean up temporary directory ${tempDir}: ${error}`
                );
            }
        }
        temporaryDirectories.length = 0; /* Clear the array */
    };

    /* Add Symbol.dispose for automatic cleanup */
    Object.defineProperty(decoratedStorage, Symbol.dispose, {
        value: cleanup,
        writable: false,
        enumerable: false,
        configurable: false,
    });

    /* Add manual cleanup method */
    Object.defineProperty(decoratedStorage, 'cleanup', {
        value: cleanup,
        writable: false,
        enumerable: false,
        configurable: false,
    });

    return decoratedStorage as IStorage & { cleanup: () => Promise<void> };
}

export default {
    withCleanup,
};
