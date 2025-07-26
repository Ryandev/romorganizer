import { exec } from 'node:child_process';
import { existsSync, lstatSync } from 'node:fs';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

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
export function guardFileExists(filePath: string, message?: string): void {
    guard(filePath !== null, message || 'No filePath given to guard against');
    guard(
        filePath !== undefined,
        message || 'No filePath given to guard against'
    );

    guard(existsSync(filePath), message || `Cannot find file: ${filePath}`);
    guard(
        lstatSync(filePath).isFile(),
        message || `Exists, but was expecting file: ${filePath}`
    );
}

/**
 * Guard that checks if a directory exists at the given path
 *
 * @param directoryPath - Path to the directory
 * @param message - Optional error message
 */
export function guardDirectoryExists(
    directoryPath: string,
    message?: string
): void {
    guard(
        directoryPath !== null,
        message || 'No directoryPath given to guard against'
    );
    guard(
        directoryPath !== undefined,
        message || 'No directoryPath given to guard against'
    );

    guard(
        existsSync(directoryPath),
        message || `Cannot find directoryPath: ${directoryPath}`
    );
    guard(
        lstatSync(directoryPath).isDirectory(),
        message || `Exists, but was expecting directory: ${directoryPath}`
    );
}

/**
 * Result of a command execution
 */
interface CommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

/**
 * Run a shell command
 *
 * @param command - Command to run
 * @returns Result of the command execution
 */
async function _runCommand(command: string): Promise<CommandResult> {
    try {
        const { stdout, stderr } = await execAsync(command);
        return {
            stdout,
            stderr,
            exitCode: 0,
        };
    } catch (error) {
        const execError = error as { code: number; stderr: string };
        return {
            stdout: '',
            stderr: execError.stderr || String(error),
            exitCode: execError.code || -1,
        };
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

    const result = await _runCommand(`command -v ${command}`).catch(error => ({
        stdout: '',
        stderr: String(error),
        exitCode: -1,
    }));

    guard(
        result.exitCode === 0,
        message ||
            `Cannot find command: ${command} in env, error:${result.stderr}, code:${result.exitCode}`
    );
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
