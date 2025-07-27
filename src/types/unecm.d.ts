declare module 'unecm' {
    import { EventEmitter } from 'node:events';

    export interface UnecmProgressData {
        progression: number; /* 0..100 - Progression of the decoding */
    }

    export interface UnecmErrorData {
        error: string;      /* Label of the error */
    }

    export interface UnecmCompleteData {
        inLength: number;   /* Source length */
        outLength: number;  /* Destination length */
    }

    export interface UnecmHandler extends EventEmitter {
        on(event: 'progress', listener: (data: UnecmProgressData) => void): this;
        on(event: 'error', listener: (data: UnecmErrorData) => void): this;
        on(event: 'complete', listener: (data: UnecmCompleteData) => void): this;

        once(event: 'progress', listener: (data: UnecmProgressData) => void): this;
        once(event: 'error', listener: (data: UnecmErrorData) => void): this;
        once(event: 'complete', listener: (data: UnecmCompleteData) => void): this;

        emit(event: 'progress', data: UnecmProgressData): boolean;
        emit(event: 'error', data: UnecmErrorData): boolean;
        emit(event: 'complete', data: UnecmCompleteData): boolean;
    }

    /**
     * UNECM decode utility
     * 
     * @param source - The source file. If not provided, the destination path plus the `.ecm` will be used.
     * @param destination - The destination file. If not provided, the source path minus the `.ecm` will be used.
     * @returns EventEmitter that emits 'progress', 'error', and 'complete' events
     * 
     * @note A source file must end with `.ecm`, the destination can't end with `.ecm`
     */
    function unecm(source?: string, destination?: string): UnecmHandler;

    export = unecm;
} 