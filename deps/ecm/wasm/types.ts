// Base interface for common WASM module properties
interface BaseWASMModule {
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
    open: (path: string, flags: string) => { fd: number; close: () => void };
    close: (stream: { fd: number; close: () => void }) => void;
    stat: (path: string) => { size: number };
  };
  ccall: (funcName: string, returnType: string, argTypes: string[], args: any[]) => any;
  onRuntimeInitialized?: () => void;
}

// ECM compression module
export interface ECMModule extends BaseWASMModule {
  _ecmify: (inFile: number, outFile: number) => number;
}

// UNECM decompression module  
export interface UNECMModule extends BaseWASMModule {
  _unecmify: (inFile: number, outFile: number) => number;
} 