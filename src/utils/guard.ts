import { $ } from 'zx';
import { log } from './logger';
import fs from 'node:fs';

/**
 * When condition is false, throw an error with the provided message
 *
 * @param condition - Condition to check
 * @param message - Optional error message
 */
export function guard(condition: boolean, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message || 'guard condition failed');
    }
}

/**
 * Guard that checks if an item is not null or undefined
 *
 * @param item - Item to check
 * @param message - Optional error message
 */
export function guardNotFalsy<T>(value: T | null | undefined, message?: string): asserts value is T {
    guard(value !== null && value !== undefined, message || 'Value is null or undefined');
    guard(!!value, message || 'Value is falsy');
}

/**
 * Guard that checks if an item is not null or undefined
 *
 * @param item - Item to check
 * @param message - Optional error message
 */
export function guardNotNull<T>(
    item: T,
    message?: string
): asserts item is NonNullable<T> {
    guard(item !== null, message || 'No item given to guard against');
    guard(item !== undefined, message || 'No item given to guard against');
}

/**
 * Guard that checks if an item is of a specific type
 *
 * @param item - Item to check
 * @param type - Type to check
 * @param message - Optional error message
 */
export function guardType<T>(
    item: unknown,
    type: string,
    message?: string
): asserts item is T {
    guard(typeof item === type, message || `Expected ${type}`);
}

/**
 * Guard that checks if an item is a valid number
 *
 * @param item - Item to check
 * @param message - Optional error message
 */
export function guardValidNumber(
    item: unknown,
    message?: string
): asserts item is number {
    guard(
        typeof item === 'number',
        message || 'No number given to guard against'
    );
    guard(
        Number.isFinite(item),
        message || 'No valid number given to guard against'
    );
    guard(
        !Number.isNaN(item),
        message || 'No valid number given to guard against'
    );
}

/**
 * Guard that checks if an item is a valid string (not null, undefined, or empty)
 *
 * @param item - Item to check
 * @param message - Optional error message
 */
export function guardValidString(
    item: unknown,
    message?: string
): asserts item is string {
    guard(item !== null, message || 'No string given to guard against');
    guard(item !== undefined, message || 'No string given to guard against');
    guard(String(item).length > 0, message || `Expected string.length > 0`);
}

/**
 * Guard that checks if a file exists at the given path
 *
 * @param filePath - Path to the file
 * @param message - Optional error message
 */
export function guardFileExists(filePath: unknown, message?: string): void {
    guard(typeof filePath === 'string', message || `Invalid file path: ${filePath}`);
    guard(filePath.length > 0, message || `Invalid file path: ${filePath}`);
    guard(fs.existsSync(filePath), message || `File does not exist: ${filePath}`);
}

export function guardFileDoesNotExist(filePath: string, message?: string): void {
    guard(typeof filePath === 'string', message || `Invalid file path: ${filePath}`);
    guard(filePath.length > 0, message || `Invalid file path: ${filePath}`);
    guard(!fs.existsSync(filePath), message || `File should not exist: ${filePath}`);
}

/**
 * Guard that checks if a directory exists at the given path
 *
 * @param directoryPath - Path to the directory
 * @param message - Optional error message
 */
export function guardDirectoryExists(directoryPath: unknown, message?: string): void {
    guard(typeof directoryPath === 'string', message || `Invalid directory path: ${directoryPath}`);
    guard(directoryPath.length > 0, message || `Invalid directory path: ${directoryPath}`);
    
    try {
        const stats = fs.statSync(directoryPath);
        guard(stats.isDirectory(), message || `Path exists but is not a directory: ${directoryPath}`);
    } catch (error) {
        // Only catch fs.statSync errors, not guard errors
        if (error instanceof Error && 
            (error.message.includes('guard condition failed') || 
             error.message.includes('Path exists but is not a directory'))) {
            throw error; // Re-throw guard errors as-is
        }
        throw new Error(message || `Directory does not exist: ${directoryPath}`);
    }
}



/**
 * Guard that checks if a command exists in the system
 *
 * @param command - Command to check
 * @param message - Optional error message
 */
export async function guardCommandExists(
    command: string,
    message?: string
): Promise<void> {
    guard(command !== null, message || 'No command given to guard against');
    guard(
        command !== undefined,
        message || 'No command given to guard against'
    );
    guard(
        typeof command === 'string',
        message || 'Invalid command given to guard against'
    );

    try {
        await $`command -v ${command}`;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
            message || `Cannot find command: ${command} in env, error: ${errorMessage}`
        );
    }
}

/**
 * Create a reusable guard that's bound to a specific condition function
 *
 * @param conditionFn - Function that returns boolean to check
 * @param defaultMessage - Default error message
 */
export function createGuard<T>(
    conditionFunction: (value: T) => boolean,
    defaultMessage: string
): (value: T, message?: string) => asserts value is T {
    return (value: T, message?: string): asserts value is T => {
        guard(conditionFunction(value), message || defaultMessage);
    };
}

// Utility function to abort execution with cleanup
export function abort(message: string): never {
    log.error(message);
    // Clean up any temporary files if they exist
    if (globalThis.temporaryFiles && Array.isArray(globalThis.temporaryFiles)) {
        globalThis.temporaryFiles.length = 0;
    }
    process.exit(1);
}
