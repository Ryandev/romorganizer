import { groupedFiles, fileExtension } from './utils';
import storage from '../utils/storage';

/* Mock dependencies */
jest.mock('../utils/storage', () => ({
    __esModule: true,
    default: jest.fn(),
}));

describe('runners/utils.ts', () => {
    const mockStorage = storage as jest.MockedFunction<typeof storage>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('groupedFiles', () => {
        it('should group files by basename correctly', async () => {
            /* Arrange */
            const mockFiles = [
                '/test/source/game1.bin',
                '/test/source/game1.cue',
                '/test/source/game2.bin',
                '/test/source/game2.cue',
                '/test/source/game3.iso',
            ];
            mockStorage.mockReturnValue({
                list: jest.fn().mockResolvedValue(mockFiles),
            } as any);

            /* Act */
            const result = await groupedFiles('/test/source');

            /* Assert */
            expect(result).toEqual([
                ['/test/source/game1.bin', '/test/source/game1.cue'],
                ['/test/source/game2.bin', '/test/source/game2.cue'],
                ['/test/source/game3.iso'],
            ]);
            expect(mockStorage().list).toHaveBeenCalledWith('/test/source', {
                recursive: true,
                avoidHiddenFiles: true,
            });
        });

        it('should handle empty directory', async () => {
            /* Arrange */
            mockStorage.mockReturnValue({
                list: jest.fn().mockResolvedValue([]),
            } as any);

            /* Act */
            const result = await groupedFiles('/test/empty');

            /* Assert */
            expect(result).toEqual([]);
            expect(mockStorage().list).toHaveBeenCalledWith('/test/empty', {
                recursive: true,
                avoidHiddenFiles: true,
            });
        });

        it('should handle files without extensions', async () => {
            /* Arrange */
            const mockFiles = [
                '/test/source/game1',
                '/test/source/game1.bin',
                '/test/source/game2',
            ];
            mockStorage.mockReturnValue({
                list: jest.fn().mockResolvedValue(mockFiles),
            } as any);

            /* Act */
            const result = await groupedFiles('/test/source');

            /* Assert */
            expect(result).toEqual([
                ['/test/source/game1', '/test/source/game1.bin'],
                ['/test/source/game2'],
            ]);
        });

        it('should handle files with multiple dots', async () => {
            /* Arrange */
            const mockFiles = [
                '/test/source/game.v1.0.bin',
                '/test/source/game.v1.0.cue',
                '/test/source/game.v2.0.iso',
            ];
            mockStorage.mockReturnValue({
                list: jest.fn().mockResolvedValue(mockFiles),
            } as any);

            /* Act */
            const result = await groupedFiles('/test/source');

            /* Assert */
            expect(result).toEqual([
                ['/test/source/game.v1.0.bin', '/test/source/game.v1.0.cue'],
                ['/test/source/game.v2.0.iso'],
            ]);
        });

        it('should handle storage errors', async () => {
            /* Arrange */
            const error = new Error('Storage error');
            mockStorage.mockReturnValue({
                list: jest.fn().mockRejectedValue(error),
            } as any);

            /* Act & Assert */
            await expect(groupedFiles('/test/source')).rejects.toThrow(
                'Storage error'
            );
        });

        it('should handle single file in directory', async () => {
            /* Arrange */
            const mockFiles = ['/test/source/single.bin'];
            mockStorage.mockReturnValue({
                list: jest.fn().mockResolvedValue(mockFiles),
            } as any);

            /* Act */
            const result = await groupedFiles('/test/source');

            /* Assert */
            expect(result).toEqual([['/test/source/single.bin']]);
        });

        it('should handle files with same basename but different paths', async () => {
            /* Arrange */
            const mockFiles = [
                '/test/source/subdir1/game.bin',
                '/test/source/subdir2/game.cue',
                '/test/source/game.iso',
            ];
            mockStorage.mockReturnValue({
                list: jest.fn().mockResolvedValue(mockFiles),
            } as any);

            /* Act */
            const result = await groupedFiles('/test/source');

            /* Assert */
            expect(result).toEqual([
                [
                    '/test/source/subdir1/game.bin',
                    '/test/source/subdir2/game.cue',
                    '/test/source/game.iso',
                ],
            ]);
        });
    });

    describe('fileExtension', () => {
        it('should extract file extension correctly', () => {
            /* Act & Assert */
            expect(fileExtension('file.txt')).toBe('txt');
            expect(fileExtension('file.bin')).toBe('bin');
            expect(fileExtension('file.cue')).toBe('cue');
            expect(fileExtension('file.iso')).toBe('iso');
        });

        it('should handle files without extension', () => {
            /* Act & Assert */
            expect(fileExtension('file')).toBe('file');
            expect(fileExtension('file.')).toBe('');
        });

        it('should handle files with multiple dots', () => {
            /* Act & Assert */
            expect(fileExtension('file.v1.0.txt')).toBe('txt');
            expect(fileExtension('file.backup.old')).toBe('old');
        });

        it('should handle empty string', () => {
            /* Act & Assert */
            expect(fileExtension('')).toBe('');
        });

        it('should handle paths with directories', () => {
            /* Act & Assert */
            expect(fileExtension('/path/to/file.txt')).toBe('txt');
            expect(fileExtension(String.raw`C:\path\to\file.bin`)).toBe('bin');
        });

        it('should handle hidden files', () => {
            /* Act & Assert */
            expect(fileExtension('.hidden')).toBe('hidden');
            expect(fileExtension('.config.txt')).toBe('txt');
        });
    });
});
