import { OperationListener } from './interface';

/**
 * Observer pattern implementation for managing callbacks by key
 */
export class CallbackManager {
    private listeners: Map<string, Set<OperationListener>> = new Map();

    /**
     * Add a listener for a specific key
     * @param key - The key to register the callback under
     * @param callback - The callback function to register
     */
    addListener(key: string, callback: OperationListener): void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            callbacks.add(callback);
        }
    }

    /**
     * Remove a listener for a specific key
     * @param key - The key the callback was registered under
     * @param callback - The callback function to remove
     */
    removeListener(key: string, callback: OperationListener): void {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            callbacks.delete(callback);
            // Clean up empty sets
            if (callbacks.size === 0) {
                this.listeners.delete(key);
            }
        }
    }

    /**
     * Get all listeners for a specific key
     * @param key - The key to get listeners for
     * @returns Array of callback functions
     */
    allListeners(key: string): OperationListener[] {
        const callbacks = this.listeners.get(key);
        return callbacks ? [...callbacks] : [];
    }

    /**
     * Check if a key has any listeners
     * @param key - The key to check
     * @returns True if the key has listeners
     */
    hasListeners(key: string): boolean {
        const callbacks = this.listeners.get(key);
        return this.listeners.has(key) && (callbacks?.size ?? 0) > 0;
    }

    /**
     * Get all registered keys
     * @returns Array of all registered keys
     */
    getKeys(): string[] {
        return [...this.listeners.keys()];
    }

    /**
     * Clear all listeners for a specific key
     * @param key - The key to clear listeners for
     */
    clearListeners(key: string): void {
        this.listeners.delete(key);
    }

    /**
     * Clear all listeners for all keys
     */
    clearAllListeners(): void {
        this.listeners.clear();
    }

    /**
     * Get the total number of listeners across all keys
     * @returns Total number of listeners
     */
    getTotalListenerCount(): number {
        let total = 0;
        for (const callbacks of this.listeners.values()) {
            total += callbacks.size;
        }
        return total;
    }
}

/**
 * Factory function to create a CallbackManager instance
 * @returns A CallbackManager instance with the specified methods
 */
export function createCallbackManager() {
    const manager = new CallbackManager();

    return {
        addListener: (key: string, callback: OperationListener) =>
            manager.addListener(key, callback),
        removeListener: (key: string, callback: OperationListener) =>
            manager.removeListener(key, callback),
        allListeners: (key: string) => manager.allListeners(key),
        hasListeners: (key: string) => manager.hasListeners(key),
        getKeys: () => manager.getKeys(),
        clearListeners: (key: string) => manager.clearListeners(key),
        clearAllListeners: () => manager.clearAllListeners(),
        getTotalListenerCount: () => manager.getTotalListenerCount(),
    };
}
