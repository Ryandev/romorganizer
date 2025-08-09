import { setTimeout } from 'node:timers';

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Adds a timeout to any promise
 * @param promise - The promise to add timeout to
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves with the original promise result or rejects with timeout error
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Command timed out')), timeoutMs)
        ),
    ]);
}
