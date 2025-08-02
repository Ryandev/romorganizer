# ECM WASM Bindings

This directory contains WebAssembly (WASM) bindings for ECM (Error Code Modeler) operations, providing a JavaScript API for encoding and decoding ECM files without requiring native command-line tools.

## Overview

ECM is a compression format commonly used for CD-ROM images. These bindings provide a clean TypeScript interface to ECM operations using compiled WASM modules from the original C source code.

## Architecture

- **WASM Modules**: Compiled from the original ECM C source code using Emscripten
- **TypeScript Wrappers**: Clean API around the WASM modules
- **Virtual Filesystem**: Uses Emscripten's virtual filesystem for file operations
- **No External Dependencies**: Self-contained, no need for native tools

## Usage

### Basic Usage

```typescript
import { EcmWasm } from './deps/ecm/wasm';

const ecmWasm = new EcmWasm();

/* Compress a file to ECM format */
await ecmWasm.compress('input.img', 'output.ecm');

/* Extract an ECM file */
await ecmWasm.extract('input.ecm', 'output.img');

/* Verify an ECM file */
const isValid = await ecmWasm.verify('input.ecm');
```

### Integration with Archive System

```typescript
import { EcmArchive } from './src/archive/ecm';

const ecmArchive = new EcmArchive('file.ecm');

/* Extract ECM file */
const outputPath = await ecmArchive.extract();
console.log('Extracted to:', outputPath);

/* Compress file to ECM */
const compressedPath = await ecmArchive.compress('/path/to/file.img');
console.log('Compressed to:', compressedPath);

/* Verify ECM file */
const isValid = await ecmArchive.verify();
console.log('Is valid:', isValid);
```

## API Reference

### EcmWasm Class

#### Constructor
```typescript
new EcmWasm()
```

#### Methods

##### `compress(inputPath: string, outputPath: string): Promise<void>`
Compresses a file to ECM format.

- **inputPath**: Path to the input file (typically .img or .bin)
- **outputPath**: Path where the ECM file will be written
- **Throws**: Error if compression fails

##### `extract(inputPath: string, outputPath: string): Promise<void>`
Extracts an ECM file to its original format.

- **inputPath**: Path to the ECM file
- **outputPath**: Path where the extracted file will be written
- **Throws**: Error if extraction fails

##### `verify(inputPath: string): Promise<boolean>`
Verifies if a file is a valid ECM file.

- **inputPath**: Path to the file to verify
- **Returns**: `true` if valid ECM file, `false` otherwise
- **Throws**: Error if verification process fails

### EcmArchive Class

Extends `BaseArchive` and provides integration with the archive system.

#### Methods

##### `extract(): Promise<string>`
Extracts the ECM file and returns the path to the extracted file.

##### `compress(filePath: string): Promise<string>`
Compresses a file to ECM format and returns the path to the compressed file.

##### `verify(): Promise<boolean>`
Verifies if the archive file is a valid ECM file.

## Building

The WASM modules are built using Emscripten:

```bash
yarn build:deps
```

This compiles the C source code to WASM and generates the necessary JavaScript bindings. The build process:

1. Compiles `src/ecm.c` to `wasm/build/ecm.js` and `wasm/build/ecm.wasm`
2. Compiles `src/unecm.c` to `wasm/build/unecm.js` and `wasm/build/unecm.wasm`
3. Generates TypeScript bindings in `wasm/wrappers/`

**Note**: The C source files have been modified with Emscripten-specific changes and are included directly in this repository rather than as a git submodule.

## Testing

Run the ECM tests:

```bash
yarn test src/archive/ecm.test.ts
```

## Notes

- **File Extensions**: Input files are typically `.img` or `.bin`, output files are `.ecm`
- **Memory Usage**: WASM modules load the entire file into memory
- **Performance**: Generally slower than native tools but more portable
- **Availability**: ECM support is disabled in production builds for size considerations
- **Error Handling**: All methods throw descriptive errors on failure
- **Cleanup**: Temporary files are automatically cleaned up

## Limitations

- No progress reporting during compression/extraction
- No streaming support - entire files must fit in memory
- Slower than native command-line tools
- Limited to ECM format only (no other compression formats) 