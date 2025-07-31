import { withTimeout } from './promise';

describe('promise', () => {
    describe('withTimeout', () => {
        it('should resolve when promise completes before timeout', async () => {
            const fastPromise = Promise.resolve('success');
            const result = await withTimeout(fastPromise, 1000);
            expect(result).toBe('success');
        });

        it('should reject when promise takes longer than timeout', async () => {
            const slowPromise = new Promise<string>((resolve) => {
                setTimeout(() => resolve('success'), 2000);
            });

            await expect(withTimeout(slowPromise, 100)).rejects.toThrow('Command timed out');
        });

        it('should reject when promise rejects before timeout', async () => {
            const failingPromise = Promise.reject(new Error('Promise failed'));
            await expect(withTimeout(failingPromise, 1000)).rejects.toThrow('Promise failed');
        });

        it('should work with async functions', async () => {
            const asyncFunction = async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'async success';
            };

            const result = await withTimeout(asyncFunction(), 1000);
            expect(result).toBe('async success');
        });
    });
}); 