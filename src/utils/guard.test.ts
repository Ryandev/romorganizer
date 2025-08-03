import {
    guard,
    guardNotFalsy,
    guardNotNull,
    guardType,
    guardValidNumber,
    guardValidString,
    guardFileExists,
    guardFileDoesNotExist,
    guardDirectoryExists,
    guardCommandExists,
    createGuard,
} from './guard';

/* Mock fs */
jest.mock('node:fs', () => ({
    existsSync: jest.fn(),
    statSync: jest.fn(),
}));

/* Mock zx */
jest.mock('zx', () => ({
    $: jest.fn().mockResolvedValue({ exitCode: 0 }),
}));

describe('Guard Functions', () => {
    let mockFs: jest.Mocked<typeof import('node:fs')>;
    let mockZx: jest.Mocked<typeof import('zx')>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFs = require('node:fs');
        mockZx = require('zx');
    });

    describe('guard', () => {
        test('should not throw when condition is true', () => {
            expect(() => guard(true)).not.toThrow();
        });

        test('should throw when condition is false', () => {
            expect(() => guard(false)).toThrow('guard condition failed');
        });

        test('should throw custom message when condition is false', () => {
            expect(() => guard(false, 'Custom error message')).toThrow(
                'Custom error message'
            );
        });
    });

    describe('guardNotFalsy', () => {
        test('should not throw for valid values', () => {
            expect(() => guardNotFalsy('test')).not.toThrow();
            expect(() => guardNotFalsy(123)).not.toThrow();
            expect(() => guardNotFalsy({})).not.toThrow();
            expect(() => guardNotFalsy([])).not.toThrow();
        });

        test('should throw for falsy values', () => {
            expect(() => guardNotFalsy(0)).toThrow('Value is falsy');
            expect(() => guardNotFalsy(false)).toThrow('Value is falsy');
            expect(() => guardNotFalsy('')).toThrow('Value is falsy');
        });

        test('should throw for null', () => {
            expect(() => guardNotFalsy(null as any)).toThrow(
                'Value is null or undefined'
            );
        });

        test('should throw for undefined', () => {
            expect(() => guardNotFalsy(undefined as any)).toThrow(
                'Value is null or undefined'
            );
        });

        test('should throw custom message for null', () => {
            expect(() =>
                guardNotFalsy(null as any, 'Custom null error')
            ).toThrow('Custom null error');
        });

        test('should throw custom message for undefined', () => {
            expect(() =>
                guardNotFalsy(undefined as any, 'Custom undefined error')
            ).toThrow('Custom undefined error');
        });
    });

    describe('guardNotNull', () => {
        test('should not throw for valid values', () => {
            expect(() => guardNotNull('test')).not.toThrow();
            expect(() => guardNotNull(123)).not.toThrow();
            expect(() => guardNotNull({})).not.toThrow();
            expect(() => guardNotNull([])).not.toThrow();
            expect(() => guardNotNull(0)).not.toThrow();
            expect(() => guardNotNull(false)).not.toThrow();
        });

        test('should throw for null', () => {
            expect(() => guardNotNull(null as any)).toThrow(
                'No item given to guard against'
            );
        });

        test('should throw for undefined', () => {
            expect(() => guardNotNull(undefined as any)).toThrow(
                'No item given to guard against'
            );
        });

        test('should throw custom message for null', () => {
            expect(() =>
                guardNotNull(null as any, 'Custom null error')
            ).toThrow('Custom null error');
        });
    });

    describe('guardType', () => {
        test('should not throw for correct string type', () => {
            expect(() => guardType<string>('test', 'string')).not.toThrow();
        });

        test('should not throw for correct number type', () => {
            expect(() => guardType<number>(123, 'number')).not.toThrow();
        });

        test('should not throw for correct boolean type', () => {
            expect(() => guardType<boolean>(true, 'boolean')).not.toThrow();
        });

        test('should throw for incorrect type', () => {
            expect(() => guardType<string>(123, 'string')).toThrow(
                'Expected string'
            );
        });

        test('should throw custom message for incorrect type', () => {
            expect(() =>
                guardType<string>(123, 'string', 'Custom type error')
            ).toThrow('Custom type error');
        });
    });

    describe('guardValidNumber', () => {
        test('should not throw for valid numbers', () => {
            expect(() => guardValidNumber(123)).not.toThrow();
            expect(() => guardValidNumber(0)).not.toThrow();
            expect(() => guardValidNumber(-123)).not.toThrow();
            expect(() => guardValidNumber(3.14)).not.toThrow();
        });

        test('should throw for non-number types', () => {
            expect(() => guardValidNumber('123')).toThrow(
                'No number given to guard against'
            );
            expect(() => guardValidNumber(null as any)).toThrow(
                'No number given to guard against'
            );
            expect(() => guardValidNumber(undefined as any)).toThrow(
                'No number given to guard against'
            );
        });

        test('should throw for NaN', () => {
            expect(() => guardValidNumber(Number.NaN)).toThrow(
                'No valid number given to guard against'
            );
        });

        test('should throw for Infinity', () => {
            expect(() => guardValidNumber(Infinity)).toThrow(
                'No valid number given to guard against'
            );
        });

        test('should throw for -Infinity', () => {
            expect(() => guardValidNumber(-Infinity)).toThrow(
                'No valid number given to guard against'
            );
        });

        test('should throw custom message', () => {
            expect(() =>
                guardValidNumber('123', 'Custom number error')
            ).toThrow('Custom number error');
        });
    });

    describe('guardValidString', () => {
        test('should not throw for valid strings', () => {
            expect(() => guardValidString('test')).not.toThrow();
            expect(() => guardValidString('123')).not.toThrow();
            expect(() =>
                guardValidString(' ')
            ).not.toThrow(); /* Space is valid */
        });

        test('should throw for null', () => {
            expect(() => guardValidString(null as any)).toThrow(
                'No string given to guard against'
            );
        });

        test('should throw for undefined', () => {
            expect(() => guardValidString(undefined as any)).toThrow(
                'No string given to guard against'
            );
        });

        test('should throw for empty string', () => {
            expect(() => guardValidString('')).toThrow(
                'Expected string.length > 0'
            );
        });

        test('should not throw for non-string types that convert to valid strings', () => {
            /* guardValidString converts values to strings using String() */
            expect(() => guardValidString(123)).not.toThrow(); /* "123" */
            expect(() =>
                guardValidString({})
            ).not.toThrow(); /* "[object Object]" */
        });

        test('should throw for non-string types that convert to empty strings', () => {
            expect(() => guardValidString([])).toThrow(
                'Expected string.length > 0'
            ); /* String([]) returns "" */
        });

        test('should throw custom message', () => {
            expect(() => guardValidString('', 'Custom string error')).toThrow(
                'Custom string error'
            );
        });
    });

    describe('guardFileExists', () => {
        beforeEach(() => {
            mockFs.existsSync.mockReturnValue(true);
        });

        test('should not throw when file exists', () => {
            expect(() => guardFileExists('/path/to/file.txt')).not.toThrow();
        });

        test('should throw for invalid file path', () => {
            expect(() => guardFileExists('')).toThrow('Invalid file path: ');
        });

        test('should throw when file does not exist', () => {
            mockFs.existsSync.mockReturnValue(false);
            expect(() => guardFileExists('/path/to/file.txt')).toThrow(
                'File does not exist: /path/to/file.txt'
            );
        });

        test('should throw custom message when file does not exist', () => {
            mockFs.existsSync.mockReturnValue(false);
            expect(() =>
                guardFileExists('/path/to/file.txt', 'Custom file error')
            ).toThrow('Custom file error');
        });
    });

    describe('guardFileDoesNotExist', () => {
        beforeEach(() => {
            mockFs.existsSync.mockReturnValue(false);
        });

        test('should not throw when file does not exist', () => {
            expect(() =>
                guardFileDoesNotExist('/path/to/file.txt')
            ).not.toThrow();
        });

        test('should throw for invalid file path', () => {
            expect(() => guardFileDoesNotExist('')).toThrow(
                'Invalid file path: '
            );
        });

        test('should throw when file exists', () => {
            mockFs.existsSync.mockReturnValue(true);
            expect(() => guardFileDoesNotExist('/path/to/file.txt')).toThrow(
                'File should not exist: /path/to/file.txt'
            );
        });

        test('should throw custom message when file exists', () => {
            mockFs.existsSync.mockReturnValue(true);
            expect(() =>
                guardFileDoesNotExist('/path/to/file.txt', 'Custom file error')
            ).toThrow('Custom file error');
        });
    });

    describe('guardDirectoryExists', () => {
        beforeEach(() => {
            mockFs.statSync.mockReturnValue({
                isDirectory: () => true,
            } as any);
        });

        test('should not throw for valid directory path', () => {
            expect(() =>
                guardDirectoryExists('/path/to/directory')
            ).not.toThrow();
        });

        test('should throw for null directory path', () => {
            expect(() => guardDirectoryExists(null as any)).toThrow(
                'Invalid directory path: null'
            );
        });

        test('should throw for undefined directory path', () => {
            expect(() => guardDirectoryExists(undefined as any)).toThrow(
                'Invalid directory path: undefined'
            );
        });

        test('should throw for empty directory path', () => {
            expect(() => guardDirectoryExists('')).toThrow(
                'Invalid directory path: '
            );
        });

        test('should throw for non-string directory path', () => {
            expect(() => guardDirectoryExists(123 as any)).toThrow(
                'Invalid directory path: 123'
            );
        });

        test('should throw when path exists but is not a directory', () => {
            mockFs.statSync.mockReset();
            mockFs.statSync.mockReturnValue({
                isDirectory: () => false,
            } as any);
            expect(() => guardDirectoryExists('/path/to/file.txt')).toThrow(
                'Path exists but is not a directory: /path/to/file.txt'
            );
        });

        test('should throw when directory does not exist', () => {
            mockFs.statSync.mockReset();
            mockFs.statSync.mockImplementation(() => {
                throw new Error('ENOENT: no such file or directory');
            });
            expect(() => guardDirectoryExists('/path/to/nonexistent')).toThrow(
                'Directory does not exist: /path/to/nonexistent'
            );
        });

        test('should throw custom message', () => {
            expect(() =>
                guardDirectoryExists('', 'Custom directory error')
            ).toThrow('Custom directory error');
        });
    });

    describe('guardCommandExists', () => {
        beforeEach(() => {
            mockZx.$.mockResolvedValue({ exitCode: 0 });
        });

        test('should not throw when command exists', async () => {
            await expect(guardCommandExists('ls')).resolves.not.toThrow();
        });

        test('should throw for null command', async () => {
            await expect(guardCommandExists(null as any)).rejects.toThrow(
                'No command given to guard against'
            );
        });

        test('should throw for undefined command', async () => {
            await expect(guardCommandExists(undefined as any)).rejects.toThrow(
                'No command given to guard against'
            );
        });

        test('should throw for non-string command', async () => {
            await expect(guardCommandExists(123 as any)).rejects.toThrow(
                'Invalid command given to guard against'
            );
        });

        test('should throw when command does not exist', async () => {
            mockZx.$.mockRejectedValue(new Error('Command not found'));
            await expect(
                guardCommandExists('nonExistentCommand')
            ).rejects.toThrow('Cannot find command: nonExistentCommand in env');
        });

        test('should throw custom message when command does not exist', async () => {
            mockZx.$.mockRejectedValue(new Error('Command not found'));
            await expect(
                guardCommandExists('nonExistentCommand', 'Custom command error')
            ).rejects.toThrow('Custom command error');
        });
    });

    describe('createGuard', () => {
        test('should create a guard that passes for valid values', () => {
            const isPositive = createGuard(
                (n: number) => n > 0,
                'Number must be positive'
            );
            expect(() => isPositive(5)).not.toThrow();
        });

        test('should create a guard that throws for invalid values', () => {
            const isPositive = createGuard(
                (n: number) => n > 0,
                'Number must be positive'
            );
            expect(() => isPositive(0)).toThrow('Number must be positive');
        });

        test('should create a guard that throws custom message', () => {
            const isPositive = createGuard(
                (n: number) => n > 0,
                'Number must be positive'
            );
            expect(() => isPositive(0, 'Custom positive error')).toThrow(
                'Custom positive error'
            );
        });

        test('should work with complex conditions', () => {
            const isValidEmail = createGuard(
                (email: string) => email.includes('@'),
                'Invalid email format'
            );
            expect(() => isValidEmail('test@example.com')).not.toThrow();
            expect(() => isValidEmail('invalid-email')).toThrow(
                'Invalid email format'
            );
        });
    });

});
