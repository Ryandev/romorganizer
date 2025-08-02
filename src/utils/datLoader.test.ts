import { loadDatFromPath } from './datLoader';

/* Mock the existing loadDat function */
jest.mock('./dat', () => ({
    loadDat: jest.fn().mockResolvedValue({
        system: 'Test System',
        games: [
            {
                name: 'Test Game',
                dat: {},
                roms: [
                    {
                        name: 'test.bin',
                        size: 1024,
                        sha1hex: 'testhash123',
                        game: {},
                    },
                ],
            },
        ],
        romsBySha1hex: new Map([
            [
                'testhash123',
                [
                    {
                        name: 'test.bin',
                        size: 1024,
                        sha1hex: 'testhash123',
                        game: {},
                    },
                ],
            ],
        ]),
    }),
}));

describe('DatLoader', () => {
    describe('loadDatFromPath', () => {
        it('should load a regular .dat file directly', async () => {
            const datPath = '/path/to/test.dat';
            const result = await loadDatFromPath(datPath);

            expect(result).toBeDefined();
            expect(result.system).toBe('Test System');
            expect(result.games).toHaveLength(1);
        });

        it('should throw error for unsupported file types', async () => {
            const unsupportedPath = '/path/to/test.txt';

            await expect(loadDatFromPath(unsupportedPath)).rejects.toThrow(
                'Unsupported file type: .txt. Only .dat and .zip files are supported.'
            );
        });
    });
});
