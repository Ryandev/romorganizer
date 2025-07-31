import createVerifyRunner from './verify';
import { Dat } from '../utils/dat';

// Mock all dependencies to prevent complex operations
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
        create: jest.fn(),
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

jest.mock('../utils/storage', () => ({
    __esModule: true,
    default: jest.fn().mockReturnValue({
        list: jest.fn().mockResolvedValue(['/path/to/file1.cue', '/path/to/file2.bin']),
        remove: jest.fn().mockResolvedValue(undefined),
        copy: jest.fn().mockResolvedValue(undefined),
        size: jest.fn().mockResolvedValue(1024),
    }),
}));

jest.mock('../utils/cuesheetLoader', () => ({
    loadCuesheetFromFile: jest.fn().mockResolvedValue({
        name: 'test',
        content: 'test content',
        path: '/path/to/test.cue',
    }),
}));

describe('createVerifyRunner', () => {
    const mockDat: Dat = {
        system: 'Test System',
        games: [],
        romsBySha1hex: new Map(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return a Runner instance for valid CHD file', () => {
        const result = createVerifyRunner('/path/to/test.chd', mockDat, []);
        expect(result).toBeInstanceOf(Object);
        expect(result).not.toBeInstanceOf(Error);
    });

    it('should return an Error for unsupported file extension', () => {
        const result = createVerifyRunner('/path/to/test.txt', mockDat, []);
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toContain('Unsupported file extension: txt');
    });

    it('should handle different file extensions', () => {
        const extensions = ['chd'];
        
        for (const ext of extensions) {
            const result = createVerifyRunner(`/path/to/test.${ext}`, mockDat, []);
            expect(result).not.toBeInstanceOf(Error);
        }
    });
}); 