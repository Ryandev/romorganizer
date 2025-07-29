import { BinSplitterException, TrackInfo, SplitResult } from './binSplitter';

describe('BinSplitter', () => {
    describe('BinSplitterException', () => {
        it('should create exception with correct name and message', () => {
            const message = 'Test error message';
            const exception = new BinSplitterException(message);
            
            expect(exception).toBeInstanceOf(Error);
            expect(exception.name).toBe('BinSplitterException');
            expect(exception.message).toBe(message);
        });
    });

    describe('TrackInfo interface', () => {
        it('should allow creating objects with TrackInfo structure', () => {
            const trackInfo: TrackInfo = {
                index: 1,
                mode: 'MODE1/2352',
                start: 0,
                length: 1024,
                filename: 'track01.bin'
            };
            
            expect(trackInfo.index).toBe(1);
            expect(trackInfo.mode).toBe('MODE1/2352');
            expect(trackInfo.start).toBe(0);
            expect(trackInfo.length).toBe(1024);
            expect(trackInfo.filename).toBe('track01.bin');
        });
    });

    describe('SplitResult interface', () => {
        it('should allow creating objects with SplitResult structure', () => {
            const splitResult: SplitResult = {
                success: true,
                tracks: [
                    {
                        index: 1,
                        mode: 'MODE1/2352',
                        start: 0,
                        length: 1024,
                        filename: 'track01.bin'
                    }
                ],
                splitFiles: ['/path/to/track01.bin'],
                message: 'Split completed successfully'
            };
            
            expect(splitResult.success).toBe(true);
            expect(splitResult.tracks).toHaveLength(1);
            expect(splitResult.splitFiles).toHaveLength(1);
            expect(splitResult.message).toBe('Split completed successfully');
        });
    });
}); 