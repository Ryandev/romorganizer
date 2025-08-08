import storage from '../utils/storage';
import path from 'node:path';
import { IRunner } from './interface';
import { log } from '../utils/logger';
import metadata, { MetadataFile } from '../types/metadata';

export class RenameRunnerDirectory implements IRunner<string[]> {
    constructor(
        private readonly sourceDir: string,
        private readonly force: boolean
    ) {
        this.sourceDir = sourceDir;
        this.force = force;
    }

    async start(): Promise<string[]> {
        const outputFiles: string[] = [];
        const files = await storage().list(this.sourceDir, {
            avoidHiddenFiles: true,
            recursive: true,
        });
        log.info(`Found ${files.length} files in source directory`);

        for (const file of files.filter(fileName =>
            fileName.endsWith('.chd')
        )) {
            /* Check if metadata.json exists for this file */
            const baseFileName = path.basename(file, path.extname(file));
            const metadataFileName = `${baseFileName}.metadata.json`;
            const metadataFilePath = path.join(
                this.sourceDir,
                metadataFileName
            );

            const metadataExists = await storage().exists(metadataFilePath);
            if (!metadataExists) {
                log.info(
                    `Skipping ${file} - no metadata.json found. Run verify command first.`
                );
                continue;
            }

            try {
                /* Read metadata file */
                const metadataContent: MetadataFile =
                    await metadata.readFile(metadataFilePath);

                /* Check if we have a game match in metadata */
                if (metadataContent.game && metadataContent.status !== 'none') {
                    const gameName = metadataContent.game.name;
                    const fileExtension = path.extname(file);
                    const newFileName = `${gameName}${fileExtension}`;
                    const newFilePath = path.join(this.sourceDir, newFileName);

                    /* Check if target file already exists */
                    const targetExists = await storage().exists(newFilePath);
                    if (targetExists && !this.force) {
                        log.info(
                            `Skipping ${file} - target file ${newFileName} already exists (use --force to overwrite)`
                        );
                        continue;
                    }

                    /* Rename the file */
                    await storage().move(file, newFilePath);
                    log.info(
                        `Renamed ${path.basename(file)} to ${newFileName}`
                    );

                    /* Also rename the metadata file to match */
                    const newMetadataFileName = `${gameName}.metadata.json`;
                    const newMetadataFilePath = path.join(
                        this.sourceDir,
                        newMetadataFileName
                    );
                    await storage().move(metadataFilePath, newMetadataFilePath);
                    log.info(`Renamed metadata file to ${newMetadataFileName}`);
                } else {
                    log.info(
                        `Skipping ${file} - no game match found in metadata (status: ${metadataContent.status})`
                    );
                }
            } catch (error) {
                log.error(
                    `Error processing ${file}: ${error instanceof Error ? error.message : String(error)}`
                );
                continue;
            }

            outputFiles.push(file);
        }

        return outputFiles;
    }
}
