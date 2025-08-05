import { createArchive } from './index';
import { createSevenZipArchive } from './seven-zip';
import { createRarArchive } from './rar';
import { createZipArchive } from './zip';
import { createEcmArchive } from './ecm';

/* Mock dependencies */
jest.mock('./seven-zip', () => ({
    createSevenZipArchive: jest.fn(),
}));

jest.mock('./rar', () => ({
    createRarArchive: jest.fn(),
}));

jest.mock('./zip', () => ({
    createZipArchive: jest.fn(),
}));

jest.mock('./ecm', () => ({
    createEcmArchive: jest.fn(),
}));

describe('archive/index.ts', () => {
    const MockCreateSevenZipArchive = createSevenZipArchive as jest.MockedFunction<typeof createSevenZipArchive>;
    const MockCreateRarArchive = createRarArchive as jest.MockedFunction<typeof createRarArchive>;
    const MockCreateZipArchive = createZipArchive as jest.MockedFunction<typeof createZipArchive>;
    const MockCreateEcmArchive = createEcmArchive as jest.MockedFunction<typeof createEcmArchive>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createArchive', () => {
        it('should create SevenZipArchive for .7z files', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockCreateSevenZipArchive.mockReturnValue(mockInstance);

            /* Act */
            const result = createArchive('/test/file.7z');

            /* Assert */
            expect(MockCreateSevenZipArchive).toHaveBeenCalledWith('/test/file.7z');
            expect(result).toBe(mockInstance);
        });

        it('should create SevenZipArchive for .7Z files (uppercase)', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockCreateSevenZipArchive.mockReturnValue(mockInstance);

            /* Act */
            const result = createArchive('/test/file.7Z');

            /* Assert */
            expect(MockCreateSevenZipArchive).toHaveBeenCalledWith('/test/file.7Z');
            expect(result).toBe(mockInstance);
        });

        it('should create RarArchive for .rar files', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockCreateRarArchive.mockReturnValue(mockInstance);

            /* Act */
            const result = createArchive('/test/file.rar');

            /* Assert */
            expect(MockCreateRarArchive).toHaveBeenCalledWith('/test/file.rar');
            expect(result).toBe(mockInstance);
        });

        it('should create RarArchive for .RAR files (uppercase)', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockCreateRarArchive.mockReturnValue(mockInstance);

            /* Act */
            const result = createArchive('/test/file.RAR');

            /* Assert */
            expect(MockCreateRarArchive).toHaveBeenCalledWith('/test/file.RAR');
            expect(result).toBe(mockInstance);
        });

        it('should create ZipArchive for .zip files', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockCreateZipArchive.mockReturnValue(mockInstance);

            /* Act */
            const result = createArchive('/test/file.zip');

            /* Assert */
            expect(MockCreateZipArchive).toHaveBeenCalledWith('/test/file.zip');
            expect(result).toBe(mockInstance);
        });

        it('should create ZipArchive for .ZIP files (uppercase)', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockCreateZipArchive.mockReturnValue(mockInstance);

            /* Act */
            const result = createArchive('/test/file.ZIP');

            /* Assert */
            expect(MockCreateZipArchive).toHaveBeenCalledWith('/test/file.ZIP');
            expect(result).toBe(mockInstance);
        });

        it('should create EcmArchive for .ecm files', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockCreateEcmArchive.mockReturnValue(mockInstance);

            /* Act */
            const result = createArchive('/test/file.ecm');

            /* Assert */
            expect(MockCreateEcmArchive).toHaveBeenCalledWith('/test/file.ecm');
            expect(result).toBe(mockInstance);
        });

        it('should create EcmArchive for .ECM files (uppercase)', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockCreateEcmArchive.mockReturnValue(mockInstance);

            /* Act */
            const result = createArchive('/test/file.ECM');

            /* Assert */
            expect(MockCreateEcmArchive).toHaveBeenCalledWith('/test/file.ECM');
            expect(result).toBe(mockInstance);
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
            MockCreateZipArchive.mockReturnValue(mockInstance);

            /* Act */
            const result = createArchive('/test/file.backup.zip');

            /* Assert */
            expect(MockCreateZipArchive).toHaveBeenCalledWith('/test/file.backup.zip');
            expect(result).toBe(mockInstance);
        });

        it('should handle files with dots in the path', () => {
            /* Arrange */
            const mockInstance = {} as any;
            MockCreateZipArchive.mockReturnValue(mockInstance);

            /* Act */
            const result = createArchive('/test/path.with.dots/file.zip');

            /* Assert */
            expect(MockCreateZipArchive).toHaveBeenCalledWith('/test/path.with.dots/file.zip');
            expect(result).toBe(mockInstance);
        });
    });
}); 