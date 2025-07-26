import { CallbackManager, createCallbackManager } from './callback';
import { OperationListener, OperationEvent, type IOperation } from './interface';

describe('CallbackManager', () => {
    let manager: CallbackManager;

    beforeEach(() => {
        manager = new CallbackManager();
    });

    describe('addListener', () => {
        it('should add a listener for a key', () => {
            const callback = jest.fn();
            manager.addListener('test', callback);

            expect(manager.allListeners('test')).toContain(callback);
        });

        it('should add multiple listeners for the same key', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            manager.addListener('test', callback1);
            manager.addListener('test', callback2);

            const listeners = manager.allListeners('test');
            expect(listeners).toHaveLength(2);
            expect(listeners).toContain(callback1);
            expect(listeners).toContain(callback2);
        });

        it('should not add duplicate listeners', () => {
            const callback = jest.fn();

            manager.addListener('test', callback);
            manager.addListener('test', callback);

            expect(manager.allListeners('test')).toHaveLength(1);
        });

        it('should handle different keys independently', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            manager.addListener('key1', callback1);
            manager.addListener('key2', callback2);

            expect(manager.allListeners('key1')).toContain(callback1);
            expect(manager.allListeners('key2')).toContain(callback2);
            expect(manager.allListeners('key1')).not.toContain(callback2);
        });
    });

    describe('removeListener', () => {
        it('should remove a specific listener', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            manager.addListener('test', callback1);
            manager.addListener('test', callback2);
            manager.removeListener('test', callback1);

            const listeners = manager.allListeners('test');
            expect(listeners).toHaveLength(1);
            expect(listeners).toContain(callback2);
            expect(listeners).not.toContain(callback1);
        });

        it('should clean up empty key when last listener is removed', () => {
            const callback = jest.fn();

            manager.addListener('test', callback);
            expect(manager.hasListeners('test')).toBe(true);

            manager.removeListener('test', callback);
            expect(manager.hasListeners('test')).toBe(false);
            expect(manager.getKeys()).not.toContain('test');
        });

        it('should handle removing non-existent listener gracefully', () => {
            const callback = jest.fn();

            expect(() => {
                manager.removeListener('test', callback);
            }).not.toThrow();
        });

        it('should handle removing from non-existent key gracefully', () => {
            const callback = jest.fn();

            expect(() => {
                manager.removeListener('nonexistent', callback);
            }).not.toThrow();
        });
    });

    describe('allListeners', () => {
        it('should return empty array for non-existent key', () => {
            expect(manager.allListeners('nonexistent')).toEqual([]);
        });

        it('should return all listeners for a key', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            const callback3 = jest.fn();

            manager.addListener('test', callback1);
            manager.addListener('test', callback2);
            manager.addListener('test', callback3);

            const listeners = manager.allListeners('test');
            expect(listeners).toHaveLength(3);
            expect(listeners).toContain(callback1);
            expect(listeners).toContain(callback2);
            expect(listeners).toContain(callback3);
        });

        it('should return a new array each time', () => {
            const callback = jest.fn();
            manager.addListener('test', callback);

            const listeners1 = manager.allListeners('test');
            const listeners2 = manager.allListeners('test');

            expect(listeners1).not.toBe(listeners2);
            expect(listeners1).toEqual(listeners2);
        });
    });

    describe('hasListeners', () => {
        it('should return false for non-existent key', () => {
            expect(manager.hasListeners('nonexistent')).toBe(false);
        });

        it('should return true when key has listeners', () => {
            const callback = jest.fn();
            manager.addListener('test', callback);

            expect(manager.hasListeners('test')).toBe(true);
        });

        it('should return false after all listeners are removed', () => {
            const callback = jest.fn();
            manager.addListener('test', callback);
            manager.removeListener('test', callback);

            expect(manager.hasListeners('test')).toBe(false);
        });
    });

    describe('getKeys', () => {
        it('should return empty array when no keys exist', () => {
            expect(manager.getKeys()).toEqual([]);
        });

        it('should return all registered keys', () => {
            const callback = jest.fn();

            manager.addListener('key1', callback);
            manager.addListener('key2', callback);
            manager.addListener('key3', callback);

            const keys = manager.getKeys();
            expect(keys).toHaveLength(3);
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
            expect(keys).toContain('key3');
        });

        it('should not return keys that have been cleaned up', () => {
            const callback = jest.fn();

            manager.addListener('key1', callback);
            manager.addListener('key2', callback);
            manager.removeListener('key1', callback);

            const keys = manager.getKeys();
            expect(keys).toHaveLength(1);
            expect(keys).toContain('key2');
            expect(keys).not.toContain('key1');
        });
    });

    describe('clearListeners', () => {
        it('should remove all listeners for a specific key', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            manager.addListener('key1', callback1);
            manager.addListener('key1', callback2);
            manager.addListener('key2', callback1);

            manager.clearListeners('key1');

            expect(manager.hasListeners('key1')).toBe(false);
            expect(manager.hasListeners('key2')).toBe(true);
            expect(manager.getKeys()).not.toContain('key1');
        });

        it('should handle clearing non-existent key gracefully', () => {
            expect(() => {
                manager.clearListeners('nonexistent');
            }).not.toThrow();
        });
    });

    describe('clearAllListeners', () => {
        it('should remove all listeners from all keys', () => {
            const callback = jest.fn();

            manager.addListener('key1', callback);
            manager.addListener('key2', callback);
            manager.addListener('key3', callback);

            manager.clearAllListeners();

            expect(manager.getKeys()).toEqual([]);
            expect(manager.getTotalListenerCount()).toBe(0);
        });
    });

    describe('getTotalListenerCount', () => {
        it('should return 0 when no listeners exist', () => {
            expect(manager.getTotalListenerCount()).toBe(0);
        });

        it('should return correct total count across all keys', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            const callback3 = jest.fn();

            manager.addListener('key1', callback1);
            manager.addListener('key1', callback2);
            manager.addListener('key2', callback3);

            expect(manager.getTotalListenerCount()).toBe(3);
        });

        it('should update count when listeners are removed', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            manager.addListener('key1', callback1);
            manager.addListener('key1', callback2);
            expect(manager.getTotalListenerCount()).toBe(2);

            manager.removeListener('key1', callback1);
            expect(manager.getTotalListenerCount()).toBe(1);
        });
    });

    describe('Type safety', () => {
        it('should work with OperationListener callbacks', () => {
            function testCallback(event: OperationEvent, operation: IOperation): void {
                console.log('Event:', event, 'Operation:', operation);
            }

            manager.addListener('test', testCallback);

            expect(manager.allListeners('test')).toContain(testCallback);
        });
    });
});

describe('createCallbackManager', () => {
    it('should return an object with the expected methods', () => {
        const manager = createCallbackManager();

        expect(typeof manager.addListener).toBe('function');
        expect(typeof manager.removeListener).toBe('function');
        expect(typeof manager.allListeners).toBe('function');
        expect(typeof manager.hasListeners).toBe('function');
        expect(typeof manager.getKeys).toBe('function');
        expect(typeof manager.clearListeners).toBe('function');
        expect(typeof manager.clearAllListeners).toBe('function');
        expect(typeof manager.getTotalListenerCount).toBe('function');
    });

    it('should work with the returned object', () => {
        const manager = createCallbackManager();
        const callback: OperationListener = jest.fn();

        manager.addListener('test', callback);
        expect(manager.allListeners('test')).toContain(callback);
        expect(manager.hasListeners('test')).toBe(true);

        manager.removeListener('test', callback);
        expect(manager.allListeners('test')).not.toContain(callback);
        expect(manager.hasListeners('test')).toBe(false);
    });

    it('should maintain separate instances', () => {
        const manager1 = createCallbackManager();
        const manager2 = createCallbackManager();
        const callback: OperationListener = jest.fn();

        manager1.addListener('test', callback);

        expect(manager1.hasListeners('test')).toBe(true);
        expect(manager2.hasListeners('test')).toBe(false);
    });

    it('should work with OperationListener callbacks', () => {
        const manager = createCallbackManager();
        function callback(event: OperationEvent, operation: IOperation): void {
            console.log('Event:', event, 'Operation:', operation);
        }

        manager.addListener('test', callback);

        expect(manager.allListeners('test')).toContain(callback);
    });
});
