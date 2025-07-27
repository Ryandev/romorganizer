declare module 'ecm' {
    import { EventEmitter } from 'node:events';

    export interface EcmProgressData {
        analyse: number;    /* 0..100 - Progression of the analysis */
        encoding: number;   /* 0..100 - Progression of the encoding */
    }

    export interface EcmErrorData {
        error: string;      /* Label of the error */
    }

    export interface EcmCompleteData {
        inLength: number;   /* Source length */
        outLength: number;  /* Destination length */
        literal: number;    /* Literal bytes */
        m1s: number;       /* Mode 1 sectors */
        m2f1: number;      /* Mode 2 form 1 sectors */
        m2f2: number;      /* Mode 2 form 2 sectors */
    }

    export interface EcmHandler extends EventEmitter {
        on(event: 'progress', listener: (data: EcmProgressData) => void): this;
        on(event: 'error', listener: (data: EcmErrorData) => void): this;
        on(event: 'complete', listener: (data: EcmCompleteData) => void): this;

        once(event: 'progress', listener: (data: EcmProgressData) => void): this;
        once(event: 'error', listener: (data: EcmErrorData) => void): this;
        once(event: 'complete', listener: (data: EcmCompleteData) => void): this;

        emit(event: 'progress', data: EcmProgressData): boolean;
        emit(event: 'error', data: EcmErrorData): boolean;
        emit(event: 'complete', data: EcmCompleteData): boolean;
    }

    /**
     * ECM encode utility
     * 
     * @param source - The source file. If not provided, the destination path minus the `.ecm` will be used.
     * @param destination - The destination file. If not provided, the source path plus the `.ecm` will be used.
     * @returns EventEmitter that emits 'progress', 'error', and 'complete' events
     * 
     * @note A source file can't end with `.ecm`, the destination must end with `.ecm`
     */
    function ecm(source?: string, destination?: string): EcmHandler;

    export = ecm;
} 