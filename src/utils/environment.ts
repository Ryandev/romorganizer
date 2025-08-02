/**
 * Global environment configuration for the application
 */
export interface Environment {
    /**
     * Custom temporary directory path. If not set, uses system default.
     */
    temporaryDirectory?: string;
}

/**
 * Global environment instance
 */
let globalEnvironment: Environment = {};

/**
 * Sets the global environment configuration
 * @param config - Environment configuration object
 */
export function setEnvironment(config: Environment): void {
    globalEnvironment = { ...globalEnvironment, ...config };
}

/**
 * Gets the current global environment configuration
 * @returns Current environment configuration
 */
export function getEnvironment(): Environment {
    return globalEnvironment;
}

/**
 * Gets the temporary directory path from environment
 * @returns Temporary directory path or undefined if not set
 */
export function getTemporaryDirectory(): string | undefined {
    return globalEnvironment.temporaryDirectory;
}

/**
 * Sets the temporary directory path in environment
 * @param path - Temporary directory path
 */
export function setTemporaryDirectory(path: string): void {
    globalEnvironment.temporaryDirectory = path;
}

/**
 * Clears the temporary directory setting (reverts to system default)
 */
export function clearTemporaryDirectory(): void {
    delete globalEnvironment.temporaryDirectory;
}
