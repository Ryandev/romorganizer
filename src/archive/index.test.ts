import { createArchive } from './index';
import { SevenZipArchive } from './seven-zip';
import { RarArchive } from './rar';
import { ZipArchive } from './zip';

/* Mock dependencies */
jest.mock('./seven-zip', () => ({
    SevenZipArchive: jest.fn(),
}));

jest.mock('./rar', () => ({
    RarArchive: jest.fn(),
}));

jest.mock('./zip', () => ({
    ZipArchive: jest.fn(),
}));

jest.mock('./ecm', () => ({
    EcmArchive: jest.fn().mockImplementation(() => {
        throw new Error('ECM support is not available in the built version. Use the development version for ECM functionality.');
    }),
}));

describe('archive/index.ts', () => {
    const MockSevenZipArchive = SevenZipArchive as jest.MockedClass<typeof SevenZipArchive>;
    const MockRarArchive = RarArchive as jest.MockedClass<typeof RarArchive>;
    const MockZipArchive = ZipArchive as jest.MockedClass<typeof ZipArchive>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createArchive', () => {
        it('should create SevenZipArchive for .7z files', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockSevenZipArchive.mockImplementation(() => mockInstance);

            /* Act */
            const result = createArchive('/test/file.7z');

            /* Assert */
            expect(MockSevenZipArchive).toHaveBeenCalledWith('/test/file.7z');
            expect(result).toBe(mockInstance);
        });

        it('should create SevenZipArchive for .7Z files (uppercase)', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockSevenZipArchive.mockImplementation(() => mockInstance);

            /* Act */
            const result = createArchive('/test/file.7Z');

            /* Assert */
            expect(MockSevenZipArchive).toHaveBeenCalledWith('/test/file.7Z');
            expect(result).toBe(mockInstance);
        });

        it('should create RarArchive for .rar files', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockRarArchive.mockImplementation(() => mockInstance);

            /* Act */
            const result = createArchive('/test/file.rar');

            /* Assert */
            expect(MockRarArchive).toHaveBeenCalledWith('/test/file.rar');
            expect(result).toBe(mockInstance);
        });

        it('should create RarArchive for .RAR files (uppercase)', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockRarArchive.mockImplementation(() => mockInstance);

            /* Act */
            const result = createArchive('/test/file.RAR');

            /* Assert */
            expect(MockRarArchive).toHaveBeenCalledWith('/test/file.RAR');
            expect(result).toBe(mockInstance);
        });

        it('should create ZipArchive for .zip files', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockZipArchive.mockImplementation(() => mockInstance);

            /* Act */
            const result = createArchive('/test/file.zip');

            /* Assert */
            expect(MockZipArchive).toHaveBeenCalledWith('/test/file.zip');
            expect(result).toBe(mockInstance);
        });

        it('should create ZipArchive for .ZIP files (uppercase)', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockZipArchive.mockImplementation(() => mockInstance);

            /* Act */
            const result = createArchive('/test/file.ZIP');

            /* Assert */
            expect(MockZipArchive).toHaveBeenCalledWith('/test/file.ZIP');
            expect(result).toBe(mockInstance);
        });

        it('should throw error for .ecm files', () => {
            /* Act & Assert */
            expect(() => createArchive('/test/file.ecm')).toThrow(
                'ECM support is not available in the built version. Use the development version for ECM functionality.'
            );
        });

        it('should throw error for .ECM files (uppercase)', () => {
            /* Act & Assert */
            expect(() => createArchive('/test/file.ECM')).toThrow(
                'ECM support is not available in the built version. Use the development version for ECM functionality.'
            );
        });

        it('should throw error for unsupported file extensions', () => {
            /* Act & Assert */
            expect(() => createArchive('/test/file.tar')).toThrow('Unsupported file extension: tar');
            expect(() => createArchive('/test/file.gz')).toThrow('Unsupported file extension: gz');
            expect(() => createArchive('/test/file.bz2')).toThrow('Unsupported file extension: bz2');
        });

        it('should throw error for files without extension', () => {
            /* Act & Assert */
            expect(() => createArchive('/test/file')).toThrow('Unsupported file extension: ');
        });

        it('should handle files with multiple dots correctly', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockZipArchive.mockImplementation(() => mockInstance);

            /* Act */
            const result = createArchive('/test/file.backup.zip');

            /* Assert */
            expect(MockZipArchive).toHaveBeenCalledWith('/test/file.backup.zip');
            expect(result).toBe(mockInstance);
        });

        it('should handle files with dots in the path', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockZipArchive.mockImplementation(() => mockInstance);

            /* Act */
            const result = createArchive('/test/path.with.dots/file.zip');

            /* Assert */
            expect(MockZipArchive).toHaveBeenCalledWith('/test/path.with.dots/file.zip');
            expect(result).toBe(mockInstance);
        });
    });
}); 