import metadata, { 
    FileMetadataSchema, 
    GameMetadataSchema, 
    DatMetadataSchema, 
    CuesheetMetadataSchema, 
    MetadataFileSchema
} from './metadata';
import storage from '../utils/storage';

/* Mock dependencies */
jest.mock('../utils/storage', () => ({
    __esModule: true,
    default: jest.fn(),
}));

describe('metadata.ts', () => {
    const mockStorage = storage as jest.MockedFunction<typeof storage>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('FileMetadataSchema', () => {
        it('should validate valid file metadata', () => {
            /* Arrange */
            const validMetadata = {
                name: 'test.bin',
                size: 1024,
                sha1hex: 'a1b2c3d4e5f6',
            };

            /* Act */
            const result = FileMetadataSchema.parse(validMetadata);

            /* Assert */
            expect(result).toEqual(validMetadata);
        });

        it('should validate file metadata with optional fields', () => {
            /* Arrange */
            const validMetadata = {
                name: 'test.bin',
                size: 1024,
                sha1hex: 'a1b2c3d4e5f6',
                crc: '12345678',
                md5: 'abcdef1234567890',
            };

            /* Act */
            const result = FileMetadataSchema.parse(validMetadata);

            /* Assert */
            expect(result).toEqual(validMetadata);
        });

        it('should reject invalid file metadata', () => {
            /* Arrange */
            const invalidMetadata = {
                name: 123, /* Should be string */
                size: '1024', /* Should be number */
                sha1hex: 'a1b2c3d4e5f6',
            };

            /* Act & Assert */
            expect(() => FileMetadataSchema.parse(invalidMetadata)).toThrow();
        });
    });

    describe('GameMetadataSchema', () => {
        it('should validate valid game metadata', () => {
            /* Arrange */
            const validMetadata = {
                name: 'Test Game',
                files: [
                    {
                        name: 'test.bin',
                        size: 1024,
                        sha1hex: 'a1b2c3d4e5f6',
                    },
                ],
                description: 'A test game',
                category: 'Action',
            };

            /* Act */
            const result = GameMetadataSchema.parse(validMetadata);

            /* Assert */
            expect(result).toEqual(validMetadata);
        });

        it('should validate game metadata with default files array', () => {
            /* Arrange */
            const validMetadata = {
                name: 'Test Game',
            };

            /* Act */
            const result = GameMetadataSchema.parse(validMetadata);

            /* Assert */
            expect(result).toEqual({
                name: 'Test Game',
                files: [],
            });
        });

        it('should reject invalid game metadata', () => {
            /* Arrange */
            const invalidMetadata = {
                name: 123, /* Should be string */
                files: 'not an array', /* Should be array */
            };

            /* Act & Assert */
            expect(() => GameMetadataSchema.parse(invalidMetadata)).toThrow();
        });
    });

    describe('DatMetadataSchema', () => {
        it('should validate valid DAT metadata', () => {
            /* Arrange */
            const validMetadata = {
                system: 'PlayStation',
                games: [
                    {
                        name: 'Test Game',
                        files: [],
                    },
                ],
            };

            /* Act */
            const result = DatMetadataSchema.parse(validMetadata);

            /* Assert */
            expect(result).toEqual(validMetadata);
        });

        it('should validate DAT metadata with default games array', () => {
            /* Arrange */
            const validMetadata = {
                system: 'PlayStation',
            };

            /* Act */
            const result = DatMetadataSchema.parse(validMetadata);

            /* Assert */
            expect(result).toEqual({
                system: 'PlayStation',
                games: [],
            });
        });
    });

    describe('CuesheetMetadataSchema', () => {
        it('should validate valid cuesheet metadata', () => {
            /* Arrange */
            const validMetadata = {
                name: 'test.cue',
                content: 'FILE "test.bin" BINARY\n  TRACK 01 MODE1/2352\n    INDEX 01 00:00:00',
            };

            /* Act */
            const result = CuesheetMetadataSchema.parse(validMetadata);

            /* Assert */
            expect(result).toEqual(validMetadata);
        });
    });

    describe('MetadataFileSchema', () => {
        it('should validate valid metadata file', () => {
            /* Arrange */
            const validMetadata = {
                game: {
                    name: 'Test Game',
                    files: [],
                },
                message: 'Test message',
                status: 'match' as const,
                timestamp: '2023-01-01T00:00:00.000Z',
            };

            /* Act */
            const result = MetadataFileSchema.parse(validMetadata);

            /* Assert */
            expect(result).toEqual(validMetadata);
        });

        it('should validate metadata file with defaults', () => {
            /* Arrange */
            const validMetadata = {
                game: {
                    name: 'Test Game',
                    files: [],
                },
            };

            /* Act */
            const result = MetadataFileSchema.parse(validMetadata);

            /* Assert */
            expect(result.message).toBe('');
            expect(result.status).toBe('none');
            expect(result.timestamp).toBeDefined();
        });

        it('should validate all status values', () => {
            /* Arrange */
            const statuses = ['match', 'partial', 'none'] as const;

            for (const status of statuses) {
                const validMetadata = {
                    game: {
                        name: 'Test Game',
                        files: [],
                    },
                    status,
                };

                /* Act */
                const result = MetadataFileSchema.parse(validMetadata);

                /* Assert */
                expect(result.status).toBe(status);
            }
        });

        it('should reject invalid status value', () => {
            /* Arrange */
            const invalidMetadata = {
                game: {
                    name: 'Test Game',
                    files: [],
                },
                status: 'invalid' as any,
            };

            /* Act & Assert */
            expect(() => MetadataFileSchema.parse(invalidMetadata)).toThrow();
        });
    });

    describe('Type exports', () => {
        it('should export correct types', () => {
            /* Assert - TypeScript types are erased at runtime, so we just verify the schemas exist */
            expect(FileMetadataSchema).toBeDefined();
            expect(GameMetadataSchema).toBeDefined();
            expect(DatMetadataSchema).toBeDefined();
            expect(CuesheetMetadataSchema).toBeDefined();
            expect(MetadataFileSchema).toBeDefined();
        });
    });

    describe('readFile', () => {
        it('should read and parse metadata file', async () => {
            /* Arrange */
            const mockMetadata = {
                game: {
                    name: 'Test Game',
                    files: [],
                },
                message: 'Test message',
                status: 'match' as const,
                timestamp: '2023-01-01T00:00:00.000Z',
            };
            const mockFileContent = new TextEncoder().encode(JSON.stringify(mockMetadata));
            
            mockStorage.mockReturnValue({
                read: jest.fn().mockResolvedValue(mockFileContent),
            } as any);

            /* Act */
            const result = await metadata.readFile('/test/metadata.json');

            /* Assert */
            expect(result).toEqual(mockMetadata);
            expect(mockStorage().read).toHaveBeenCalledWith('/test/metadata.json');
        });

        it('should handle storage errors', async () => {
            /* Arrange */
            const error = new Error('Storage error');
            mockStorage.mockReturnValue({
                read: jest.fn().mockRejectedValue(error),
            } as any);

            /* Act & Assert */
            await expect(metadata.readFile('/test/metadata.json')).rejects.toThrow('Storage error');
        });

        it('should handle invalid JSON', async () => {
            /* Arrange */
            const invalidJson = new TextEncoder().encode('invalid json');
            
            mockStorage.mockReturnValue({
                read: jest.fn().mockResolvedValue(invalidJson),
            } as any);

            /* Act & Assert */
            await expect(metadata.readFile('/test/metadata.json')).rejects.toThrow();
        });
    });

    describe('writeFile', () => {
        it('should write valid metadata to file', async () => {
            /* Arrange */
            const mockMetadata = {
                game: {
                    name: 'Test Game',
                    files: [],
                },
                message: 'Test message',
                status: 'match' as const,
                timestamp: '2023-01-01T00:00:00.000Z',
            };
            
            mockStorage.mockReturnValue({
                write: jest.fn().mockResolvedValue(undefined),
            } as any);

            /* Act */
            await metadata.writeFile(mockMetadata, '/test/metadata.json');

            /* Assert */
            expect(mockStorage().write).toHaveBeenCalledWith(
                '/test/metadata.json',
                expect.any(Uint8Array)
            );
        });

        it('should validate metadata before writing', async () => {
            /* Arrange */
            const invalidMetadata = {
                game: {
                    name: 123, /* Should be string */
                    files: [],
                },
                message: 'Test message',
                status: 'match' as const,
                timestamp: '2023-01-01T00:00:00.000Z',
            };
            
            mockStorage.mockReturnValue({
                write: jest.fn().mockResolvedValue(undefined),
            } as any);

            /* Act & Assert */
            await expect(metadata.writeFile(invalidMetadata as any, '/test/metadata.json')).rejects.toThrow();
            expect(mockStorage().write).not.toHaveBeenCalled();
        });

        it('should handle storage errors', async () => {
            /* Arrange */
            const mockMetadata = {
                game: {
                    name: 'Test Game',
                    files: [],
                },
                message: 'Test message',
                status: 'match' as const,
                timestamp: '2023-01-01T00:00:00.000Z',
            };
            const error = new Error('Storage error');
            
            mockStorage.mockReturnValue({
                write: jest.fn().mockRejectedValue(error),
            } as any);

            /* Act & Assert */
            await expect(metadata.writeFile(mockMetadata, '/test/metadata.json')).rejects.toThrow('Storage error');
        });
    });
});
