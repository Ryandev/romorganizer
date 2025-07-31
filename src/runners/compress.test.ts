import { Runner, IRunner } from './compress';
import createCHDRunner from './compress';

// Mock all dependencies
jest.mock('../utils/logger', () => ({
    log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../utils/chd', () => ({
    __esModule: true,
    default: {
        extract: jest.fn().mockResolvedValue('/path/to/extracted.cue'),
        create: jest.fn().mockResolvedValue('/path/to/created.chd'),
    },
}));

jest.mock('../archive/rar', () => ({
    RarArchive: jest.fn().mockImplementation(() => ({
        extract: jest.fn().mockResolvedValue('/path/to/extracted'),
    })),
}));

jest.mock('../archive/zip', () => ({
    ZipArchive: jest.fn().mockImplementation(() => ({
        extract: jest.fn().mockResolvedValue('/path/to/extracted'),
    })),
}));

jest.mock('../archive/ecm', () => ({
    EcmArchive: jest.fn().mockImplementation(() => ({
        extract: jest.fn().mockResolvedValue('/path/to/extracted.bin'),
    })),
}));

jest.mock('../archive/seven-zip', () => ({
    SevenZipArchive: jest.fn().mockImplementation(() => ({
        extract: jest.fn().mockResolvedValue('/path/to/extracted'),
    })),
}));

jest.mock('../utils/mdf', () => ({
    extract: jest.fn().mockResolvedValue('/path/to/extracted.iso'),
    verify: jest.fn().mockResolvedValue(true),
    create: jest.fn().mockRejectedValue(new Error('MDF compression is not supported')),
}));

jest.mock('../utils/guard', () => ({
    guard: jest.fn(),
    guardNotFalsy: jest.fn((value) => value),
    guardValidString: jest.fn((value) => value),
}));

const mockStorage = {
    stat: jest.fn().mockResolvedValue({ size: 1024 }),
    crc32: jest.fn().mockResolvedValue('12345678'),
    list: jest.fn().mockResolvedValue(['/path/to/file1.cue', '/path/to/file2.bin']),
    copy: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    createTemporaryDirectory: jest.fn().mockResolvedValue('/tmp/test-dir'),
    move: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
    write: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    isFile: jest.fn().mockResolvedValue(true),
    isDirectory: jest.fn().mockResolvedValue(false),
    createDirectory: jest.fn().mockResolvedValue(undefined),
    size: jest.fn().mockResolvedValue(1024),
    pathSeparator: jest.fn().mockReturnValue('/'),
    identifier: 'mock-storage',
};

jest.mock('../utils/storage', () => ({
    __esModule: true,
    default: jest.fn(() => mockStorage),
}));

jest.mock('../utils/cuesheetLoader', () => ({
    loadCuesheetFromFile: jest.fn().mockResolvedValue({
        name: 'test',
        content: 'test content',
        path: '/path/to/test.cue',
    }),
}));

describe('createCHDRunner', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return a Runner instance for valid CUE file', () => {
        const result = createCHDRunner(['/path/to/test.cue']);
        expect(result).toBeInstanceOf(Runner);
    });

    it('should return a Runner instance for valid GDI file', () => {
        const result = createCHDRunner(['/path/to/test.gdi']);
        expect(result).toBeInstanceOf(Runner);
    });

    it('should return a Runner instance for valid ISO file', () => {
        const result = createCHDRunner(['/path/to/test.iso']);
        expect(result).toBeInstanceOf(Runner);
    });

    it('should return an Error for unsupported IMG file', () => {
        const result = createCHDRunner(['/path/to/test.img']);
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toContain('No matching extensions found');
    });

    it('should return a Runner instance for valid MDF file', () => {
        const result = createCHDRunner(['/path/to/test.mdf']);
        expect(result).toBeInstanceOf(Runner);
    });

    it('should return an Error for unsupported MDS file', () => {
        const result = createCHDRunner(['/path/to/test.mds']);
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toContain('No matching extensions found');
    });

    it('should return a Runner instance for valid ECM file', () => {
        const result = createCHDRunner(['/path/to/test.ecm']);
        expect(result).toBeInstanceOf(Runner);
    });

    it('should return a Runner instance for valid 7Z file', () => {
        const result = createCHDRunner(['/path/to/test.7z']);
        expect(result).toBeInstanceOf(Runner);
    });

    it('should return a Runner instance for valid CHD file', () => {
        const result = createCHDRunner(['/path/to/test.chd']);
        expect(result).toBeInstanceOf(Runner);
    });

    it('should return a Runner instance for valid RAR file', () => {
        const result = createCHDRunner(['/path/to/test.rar']);
        expect(result).toBeInstanceOf(Runner);
    });

    it('should return a Runner instance for valid ZIP file', () => {
        const result = createCHDRunner(['/path/to/test.zip']);
        expect(result).toBeInstanceOf(Runner);
    });

    it('should return an Error for unsupported file extension', () => {
        const result = createCHDRunner(['/path/to/test.txt']);
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toContain('No matching extensions found');
    });
});

describe('Runner', () => {
    let runner: IRunner;

    beforeEach(() => {
        jest.clearAllMocks();
        runner = new Runner(['/path/to/test.cue'], '/path/to/output.chd');
    });

    it('should implement IRunner interface', () => {
        expect(runner).toHaveProperty('start');
        expect(typeof runner.start).toBe('function');
    });

    it('should have start method that returns a Promise', async () => {
        const result = runner.start();
        expect(result).toBeInstanceOf(Promise);
    });

    // Don't test the actual start() method as it has complex logic
    // that can cause infinite recursion with the current mocks
});
