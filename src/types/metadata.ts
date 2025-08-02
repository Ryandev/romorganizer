import storage from '../utils/storage';
import { z } from 'zod';

/* Schema for file metadata */
export const FileMetadataSchema = z.object({
    name: z.string(),
    size: z.number(),
    sha1hex: z.string(),
    crc: z.string().optional(),
    md5: z.string().optional(),
});

/* Schema for Game metadata */
export const GameMetadataSchema = z.object({
    name: z.string(),
    files: z.array(FileMetadataSchema).default([]),
    description: z.string().optional(),
    category: z.string().optional(),
});

/* Schema for DAT metadata */
export const DatMetadataSchema = z.object({
    system: z.string(),
    games: z.array(GameMetadataSchema).default([]),
});

/* Schema for cuesheet metadata */
export const CuesheetMetadataSchema = z.object({
    name: z.string(),
    content: z.string(),
});

/* Schema for the complete metadata file */
export const MetadataFileSchema = z.object({
    game: GameMetadataSchema.optional(),
    message: z.string().optional().default(''),
    status: z.enum(['match', 'partial', 'none']).optional().default('none'),
    timestamp: z.string().optional().default(new Date().toISOString()),
});

export type FileMetadata = z.infer<typeof FileMetadataSchema>;
export type GameMetadata = z.infer<typeof GameMetadataSchema>;
export type DatMetadata = z.infer<typeof DatMetadataSchema>;
export type CuesheetMetadata = z.infer<typeof CuesheetMetadataSchema>;
export type MetadataFile = z.infer<typeof MetadataFileSchema>;

async function readFile(filePath: string): Promise<MetadataFile> {
    const file = await storage().read(filePath);
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(file);
    return JSON.parse(jsonString);
}

async function writeFile(
    metadata: z.infer<typeof MetadataFileSchema>,
    filePath: string
) {
    /* Validate metadata with zod */
    const validatedMetadata = MetadataFileSchema.parse(metadata);

    const jsonString = JSON.stringify(validatedMetadata, undefined, 2);
    const encoder = new TextEncoder();
    await storage().write(filePath, encoder.encode(jsonString));
}

export default {
    readFile,
    writeFile,
};
