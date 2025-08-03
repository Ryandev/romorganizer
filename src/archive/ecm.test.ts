import { EcmArchive } from './ecm';
import { EcmWasm } from '../../deps/ecm/wasm';
import { log } from '../utils/logger';
import storage from '../utils/storage';
import { guardFileExists } from '../utils/guard';

/* Mock dependencies */
jest.mock('../../deps/ecm/wasm', () => ({
    EcmWasm: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
    log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../utils/storage', () => ({
    __esModule: true,
    default: jest.fn().mockResolvedValue({
        exists: jest.fn(),
        list: jest.fn(),
        read: jest.fn(),
        write: jest.fn(),
        copy: jest.fn(),
        move: jest.fn(),
        remove: jest.fn(),
        createTemporaryDirectory: jest.fn(),
    }),
}));

jest.mock('../utils/guard', () => ({
    guardFileExists: jest.fn(),
}));

describe('EcmArchive', () => {
    const mockLog = log as jest.Mocked<typeof log>;
    const MockEcmWasm = EcmWasm as jest.MockedClass<typeof EcmWasm>;
    const mockStorage = storage as jest.MockedFunction<typeof storage>;
    const mockGuardFileExists = guardFileExists as jest.MockedFunction<typeof guardFileExists>;

    let mockEcmWasmInstance: any;
    let ecmArchive: EcmArchive;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockEcmWasmInstance = {
            extract: jest.fn(),
            verify: jest.fn(),
            compress: jest.fn(),
        };
        MockEcmWasm.mockImplementation(() => mockEcmWasmInstance);
        
        ecmArchive = new EcmArchive('/test/file.ecm');
    });

    describe('constructor', () => {
        it('should create EcmArchive instance with file path', () => {
            /* Act */
            const archive = new EcmArchive('/test/file.ecm');

            /* Assert */
            expect(archive).toBeInstanceOf(EcmArchive);
            expect(MockEcmWasm).toHaveBeenCalledTimes(2); /* Once in constructor, once in beforeEach */
        });

        it('should create EcmWasm instance', () => {
            /* Assert */
            expect(MockEcmWasm).toHaveBeenCalled();
        });
    });

    describe('extract', () => {
        it('should extract ECM file successfully', async () => {
            /* Arrange */
            mockEcmWasmInstance.extract.mockResolvedValue(undefined);
            mockGuardFileExists.mockImplementation(() => {
                /* No-op for guard check */
            });

            /* Act */
            const result = await ecmArchive.extract();

            /* Assert */
            expect(mockGuardFileExists).toHaveBeenCalledWith('/test/file.ecm');
            expect(mockEcmWasmInstance.extract).toHaveBeenCalledWith('/test/file.ecm', expect.stringContaining('extracted.bin'));
            expect(mockLog.info).toHaveBeenCalledWith('Extracted /test/file.ecm');
            expect(result).toMatch(/extracted\.bin$/);
        });

        it('should handle extraction errors', async () => {
            /* Arrange */
            const error = new Error('ECM extraction failed');
            mockEcmWasmInstance.extract.mockRejectedValue(error);
            mockGuardFileExists.mockImplementation(() => {
                /* No-op for guard check */
            });

            /* Act & Assert */
            await expect(ecmArchive.extract()).rejects.toThrow('ECM extraction failed: ECM extraction failed');
        });

        it('should handle non-Error objects in extraction', async () => {
            /* Arrange */
            mockEcmWasmInstance.extract.mockRejectedValue('String error');
            mockGuardFileExists.mockImplementation(() => {
                /* No-op for guard check */
            });

            /* Act & Assert */
            await expect(ecmArchive.extract()).rejects.toThrow('ECM extraction failed: String error');
        });

        it('should handle file not found error', async () => {
            /* Arrange */
            mockGuardFileExists.mockImplementation(() => {
                throw new Error('File not found');
            });

            /* Act & Assert */
            await expect(ecmArchive.extract()).rejects.toThrow('File not found');
        });
    });

    describe('verify', () => {
        it('should verify valid ECM file successfully', async () => {
            /* Arrange */
            const mockStorageInstance = {
                exists: jest.fn().mockResolvedValue(true),
            };
            mockStorage.mockResolvedValue(mockStorageInstance as any);
            mockEcmWasmInstance.verify.mockResolvedValue(true);

            /* Act */
            const result = await ecmArchive.verify();

            /* Assert */
            expect(mockLog.info).toHaveBeenCalledWith('Verifying /test/file.ecm...');
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/test/file.ecm');
            expect(mockEcmWasmInstance.verify).toHaveBeenCalledWith('/test/file.ecm');
            expect(mockLog.info).toHaveBeenCalledWith('✓ /test/file.ecm appears to be a valid ECM file');
            expect(result).toBe(true);
        });

        it('should return false when file does not exist', async () => {
            /* Arrange */
            const mockStorageInstance = {
                exists: jest.fn().mockResolvedValue(false),
            };
            mockStorage.mockResolvedValue(mockStorageInstance as any);

            /* Act */
            const result = await ecmArchive.verify();

            /* Assert */
            expect(mockLog.warn).toHaveBeenCalledWith('✗ /test/file.ecm does not exist');
            expect(result).toBe(false);
        });

        it('should return false when ECM file is invalid', async () => {
            /* Arrange */
            const mockStorageInstance = {
                exists: jest.fn().mockResolvedValue(true),
            };
            mockStorage.mockResolvedValue(mockStorageInstance as any);
            mockEcmWasmInstance.verify.mockResolvedValue(false);

            /* Act */
            const result = await ecmArchive.verify();

            /* Assert */
            expect(mockLog.warn).toHaveBeenCalledWith('✗ /test/file.ecm is not a valid ECM file');
            expect(result).toBe(false);
        });

        it('should handle verification errors', async () => {
            /* Arrange */
            const error = new Error('Verification failed');
            mockStorage.mockRejectedValue(error as any);

            /* Act */
            const result = await ecmArchive.verify();

            /* Assert */
            expect(mockLog.warn).toHaveBeenCalledWith('✗ /test/file.ecm is not accessible: Error: Verification failed');
            expect(result).toBe(false);
        });

        it('should handle non-Error objects in verification', async () => {
            /* Arrange */
            mockStorage.mockRejectedValue('String error' as any);

            /* Act */
            const result = await ecmArchive.verify();

            /* Assert */
            expect(mockLog.warn).toHaveBeenCalledWith('✗ /test/file.ecm is not accessible: String error');
            expect(result).toBe(false);
        });
    });

    describe('compress', () => {
        it('should compress file to ECM successfully', async () => {
            /* Arrange */
            const inputFile = '/test/input.bin';
            mockEcmWasmInstance.compress.mockResolvedValue(undefined);
            mockGuardFileExists.mockImplementation(() => {
                /* No-op for guard check */
            });

            /* Act */
            const result = await ecmArchive.compress(inputFile);

            /* Assert */
            expect(mockGuardFileExists).toHaveBeenCalledWith(inputFile);
            expect(mockEcmWasmInstance.compress).toHaveBeenCalledWith(inputFile, expect.stringContaining('input.bin.ecm'));
            expect(mockLog.info).toHaveBeenCalledWith('Encoded /test/input.bin');
            expect(result).toMatch(/input\.bin\.ecm$/);
        });

        it('should handle compression errors', async () => {
            /* Arrange */
            const inputFile = '/test/input.bin';
            const error = new Error('Compression failed');
            mockEcmWasmInstance.compress.mockRejectedValue(error);
            mockGuardFileExists.mockImplementation(() => {
                /* No-op for guard check */
            });

            /* Act & Assert */
            await expect(ecmArchive.compress(inputFile)).rejects.toThrow('ECM compression failed: Compression failed');
        });

        it('should handle non-Error objects in compression', async () => {
            /* Arrange */
            const inputFile = '/test/input.bin';
            mockEcmWasmInstance.compress.mockRejectedValue('String error');
            mockGuardFileExists.mockImplementation(() => {
                /* No-op for guard check */
            });

            /* Act & Assert */
            await expect(ecmArchive.compress(inputFile)).rejects.toThrow('ECM compression failed: String error');
        });

        it('should handle file not found error in compression', async () => {
            /* Arrange */
            const inputFile = '/test/input.bin';
            mockGuardFileExists.mockImplementation(() => {
                throw new Error('File not found');
            });

            /* Act & Assert */
            await expect(ecmArchive.compress(inputFile)).rejects.toThrow('File not found');
        });
    });
});
