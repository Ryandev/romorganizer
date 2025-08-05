
export interface Archive {
    archiveFile: () => string;
    extract(): Promise<string>;
    verify(): Promise<boolean>;
    compress(contentsDirectory: string): Promise<string>;
}
