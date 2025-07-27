import { log } from "./utils/logger";
import chd from "./utils/chd"
import { RarArchive } from "./archive/rar"
import { ZipArchive } from "./archive/zip"
// import { EcmArchive } from "./archive/ecm"
import { SevenZipArchive } from "./archive/seven-zip"
import { guard, guardValidString } from "./utils/guard";

export interface IRunner {
    start(): Promise<void>;
}

const _fileExtension = (filePath: string): string => {
    return filePath.split('.').pop() ?? '';
}

const _filesWithExtension = (fileListings: string[], extension: string): string[] => {
    return fileListings.filter((file) => _fileExtension(file) === extension);
}

const EXTRACT_OPERATIONS = new Map<string, (sourceFile: string) => Promise<string>>([
    // ['ecm', (sourceFile: string) => new EcmArchive(sourceFile).extract()],
    ['7z', (sourceFile: string) => new SevenZipArchive(sourceFile).extract()],
    ['chd', chd.extract],
    ['rar', (sourceFile: string) => new RarArchive(sourceFile).extract()],
    ['zip', (sourceFile: string) => new ZipArchive(sourceFile).extract()]
]);

export class Runner implements IRunner {
    private readonly cleanupOperations: (() => Promise<void>)[];
    constructor(private readonly sourceFile: string, private readonly targetExtension: 'chd' | 'bin') {
        this.sourceFile = sourceFile;
        this.targetExtension = targetExtension;
        this.cleanupOperations = [] as (() => Promise<void>)[];
    }

    private async _work(fileListings: string[]): Promise<string> {
        const matchingTargetExtensionFiles = _filesWithExtension(fileListings, this.targetExtension);

        if ( matchingTargetExtensionFiles.length === 0) {
            // Carry on
        } else if (matchingTargetExtensionFiles.length === 1) {
            return matchingTargetExtensionFiles[0] ?? '';
        } else if (matchingTargetExtensionFiles.length > 1) {
            /* combine the files into a single file */
            // TODO
            throw new Error(`No matching extensions found for ${this.sourceFile}`);
        }

        const operations = fileListings.map((filePath) => {
            const fileExtension = _fileExtension(filePath);
            const operation = EXTRACT_OPERATIONS.get(fileExtension);
            return operation ? { filePath, operation } : undefined;
        }).filter((operation) => operation !== undefined);

        if (operations.length === 0) {
            throw new Error(`No matching extensions found for ${this.sourceFile}`);
        } else if (operations.length > 1 ) {
            throw new Error(`Multiple matching extensions found for ${this.sourceFile}: ${operations.join(', ')}`);
        } else {
            const operationEntry = operations.at(0);
            guard(operationEntry !== undefined);
            const { filePath, operation } = operationEntry;
            guardValidString(operation);
            guardValidString(filePath);
            const result = await operation(filePath);
            return await this._work([result]);
        }
    }

    async start(): Promise<void> {
        /* check if the source matches the extension */
        if ( _fileExtension(this.sourceFile) === this.targetExtension) {
            log.info(`Source file ${this.sourceFile} already matches the target extension ${this.targetExtension}`);
            return
        }

        const result = await this._work([this.sourceFile]);

        guardValidString(result);

        return result;
    }
}



export default function createRunner(sourceFile: string, targetExtension: 'chd' | 'bin'): IRunner|Error {
    const sourceExtension = _fileExtension(sourceFile);

    if (!EXTRACT_OPERATIONS.has(sourceExtension)) {
        return new Error(`No matching extensions found for ${sourceFile}`);
    }

    return new Runner(sourceFile, targetExtension);
}