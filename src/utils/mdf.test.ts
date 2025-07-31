import * as mdf from './mdf';
import { doesCommandExist, isCommandExecutable } from './command';

// Mock all dependencies
jest.mock('zx', () => ({
    $: jest.fn(),
}));

jest.mock('./logger', () => ({
    log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('./storage', () => ({
    __esModule: true,
    default: jest.fn().mockReturnValue({
        exists: jest.fn().mockResolvedValue(true),
        size: jest.fn().mockResolvedValue(1024),
        createTemporaryDirectory: jest.fn().mockResolvedValue('/tmp/test'),
        remove: jest.fn().mockResolvedValue(undefined),
        copy: jest.fn().mockResolvedValue(undefined),
        move: jest.fn().mockResolvedValue(undefined),
        write: jest.fn().mockResolvedValue(undefined),
        read: jest.fn().mockResolvedValue(new Uint8Array()),
        list: jest.fn().mockResolvedValue([]),
    }),
}));

jest.mock('./command', () => ({
    doesCommandExist: jest.fn(),
    isCommandExecutable: jest.fn(),
}));

jest.mock('./guard', () => ({
    guard: jest.fn((condition, message) => {
        if (!condition) {
            throw new Error(message);
        }
    }),
}));

describe('mdf', () => {
    const mockFilePath = '/path/to/test.mdf';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('extract', () => {
        it('should throw error when mdf2iso is not available', async () => {
            (doesCommandExist as jest.Mock).mockResolvedValue(false);
            (isCommandExecutable as jest.Mock).mockResolvedValue(false);

            await expect(mdf.extract(mockFilePath)).rejects.toThrow('MDF2ISO conversion failed');
        });

        it('should convert MDF to ISO when mdf2iso is available', async () => {
            (doesCommandExist as jest.Mock).mockResolvedValue(true);
            (isCommandExecutable as jest.Mock).mockResolvedValue(true);

            // Mock the zx $ function to return a successful result
            const mockZx = require('zx');
            mockZx.$ = jest.fn().mockResolvedValue({ exitCode: 0 });

            const result = await mdf.extract(mockFilePath);
            expect(result).toContain('.iso');
        });
    });

    describe('verify', () => {
        it('should return true for valid MDF file', async () => {
            const result = await mdf.verify(mockFilePath);
            expect(result).toBe(true);
        });

        it('should return false for non-existent file', async () => {
            const storageMock = require('./storage').default();
            storageMock.exists.mockResolvedValue(false);

            const result = await mdf.verify(mockFilePath);
            expect(result).toBe(false);
        });

        it('should return false for empty file', async () => {
            const storageMock = require('./storage').default();
            storageMock.size.mockResolvedValue(0);

            const result = await mdf.verify(mockFilePath);
            expect(result).toBe(false);
        });
    });

    describe('create', () => {
        it('should throw error as MDF compression is not supported', async () => {
            await expect(mdf.create('/path/to/contents')).rejects.toThrow(
                'MDF compression is not supported - MDF is a read-only format'
            );
        });
    });
}); 