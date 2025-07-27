import { setTimeout } from 'node:timers';

// Helper function to add timeout to zx commands
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 2000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Command timed out')), timeoutMs)
        )
    ]);
}