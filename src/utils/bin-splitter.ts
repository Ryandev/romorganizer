export class BinSplitterException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BinSplitterException';
    }
}

export interface TrackInfo {
    index: number;
    mode: string;
    start: number;
    length: number;
    filename: string;
}

export interface SplitResult {
    success: boolean;
    tracks: TrackInfo[];
    splitFiles: string[];
    message: string;
}
