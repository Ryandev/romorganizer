import * as mdf from './mdf';
import { doesCommandExist, isCommandExecutable } from './command';

/* Mock all dependencies */
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
    guardFileExists: jest.fn(),
}));

describe('mdf', () => {
    const mockFilePath = '/path/to/test.mdf';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('convertToIso', () => {
        it('should throw error when iat is not available', async () => {
            (doesCommandExist as jest.Mock).mockResolvedValue(false);
            (isCommandExecutable as jest.Mock).mockResolvedValue(false);

            await expect(mdf.convertToIso(mockFilePath)).rejects.toThrow(
                'IAT conversion failed'
            );
        });

        it('should convert MDF to ISO when iat is available', async () => {
            (doesCommandExist as jest.Mock).mockResolvedValue(true);
            (isCommandExecutable as jest.Mock).mockResolvedValue(true);

            /* Mock the zx $ function to return a successful result */
            const mockZx = require('zx');
            mockZx.$ = jest.fn().mockResolvedValue({ exitCode: 0 });

            const result = await mdf.convertToIso(mockFilePath);
            expect(result).toContain('.iso');
        });
    });
});
