import { FileMetadataSchema, GameMetadataSchema, DatMetadataSchema, MetadataFileSchema } from './metadata';

describe('Metadata Schemas', () => {
    describe('FileMetadataSchema', () => {
        it('should validate basic file metadata', () => {
            const fileMetadata = {
                name: 'test.bin',
                size: 1024,
                sha1hex: 'abc123'
            };
            
            const result = FileMetadataSchema.safeParse(fileMetadata);
            expect(result.success).toBe(true);
        });

        it('should validate file metadata with optional crc and md5 fields', () => {
            const fileMetadata = {
                name: 'test.bin',
                size: 1024,
                sha1hex: 'abc123',
                crc: '92b3ff37',
                md5: '56125070a7f679f547133512543a3585'
            };
            
            const result = FileMetadataSchema.safeParse(fileMetadata);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.crc).toBe('92b3ff37');
                expect(result.data.md5).toBe('56125070a7f679f547133512543a3585');
            }
        });

        it('should reject invalid file metadata', () => {
            const fileMetadata = {
                name: 'test.bin',
                size: 'invalid',
                sha1hex: 'abc123'
            };
            
            const result = FileMetadataSchema.safeParse(fileMetadata);
            expect(result.success).toBe(false);
        });
    });

    describe('GameMetadataSchema', () => {
        it('should validate basic game metadata', () => {
            const gameMetadata = {
                name: 'Test Game',
                files: [
                    {
                        name: 'test.bin',
                        size: 1024,
                        sha1hex: 'abc123'
                    }
                ]
            };
            
            const result = GameMetadataSchema.safeParse(gameMetadata);
            expect(result.success).toBe(true);
        });

        it('should validate game metadata with optional description and category fields', () => {
            const gameMetadata = {
                name: 'Test Game',
                files: [
                    {
                        name: 'test.bin',
                        size: 1024,
                        sha1hex: 'abc123',
                        crc: '92b3ff37',
                        md5: '56125070a7f679f547133512543a3585'
                    }
                ],
                description: 'Ace Combat 3 - Electrosphere (Europe) (En,Fr,De,Es,It)',
                category: 'Games'
            };
            
            const result = GameMetadataSchema.safeParse(gameMetadata);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.description).toBe('Ace Combat 3 - Electrosphere (Europe) (En,Fr,De,Es,It)');
                expect(result.data.category).toBe('Games');
            }
        });

        it('should reject invalid game metadata', () => {
            const gameMetadata = {
                name: 'Test Game',
                files: 'invalid'
            };
            
            const result = GameMetadataSchema.safeParse(gameMetadata);
            expect(result.success).toBe(false);
        });
    });

    describe('DatMetadataSchema', () => {
        it('should validate dat metadata', () => {
            const datMetadata = {
                system: 'Test System',
                games: [
                    {
                        name: 'Test Game',
                        files: [
                            {
                                name: 'test.bin',
                                size: 1024,
                                sha1hex: 'abc123'
                            }
                        ]
                    }
                ]
            };
            
            const result = DatMetadataSchema.safeParse(datMetadata);
            expect(result.success).toBe(true);
        });
    });

    describe('MetadataFileSchema', () => {
        it('should validate metadata file with game', () => {
            const metadataFile = {
                game: {
                    name: 'Test Game',
                    files: [
                        {
                            name: 'test.bin',
                            size: 1024,
                            sha1hex: 'abc123'
                        }
                    ]
                },
                timestamp: '2023-01-01T00:00:00.000Z'
            };
            
            const result = MetadataFileSchema.safeParse(metadataFile);
            expect(result.success).toBe(true);
        });

        it('should validate metadata file without game', () => {
            const metadataFile = {
                timestamp: '2023-01-01T00:00:00.000Z'
            };
            
            const result = MetadataFileSchema.safeParse(metadataFile);
            expect(result.success).toBe(true);
        });
    });
}); 