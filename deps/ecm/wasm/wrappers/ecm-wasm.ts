import path from 'node:path';
import { existsSync } from 'node:fs';
import type { ECMModule, UNECMModule } from '../types.js';

/* Extend Process interface for pkg */
declare global {
  namespace NodeJS {
    interface Process {
      pkg?: {
        defaultEntry?: string;
      };
    }
  }
}

function guard(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const debugEnabled = process.env['DEBUG'] === '1';

const _debug = (...args: any[]) => {
  if (debugEnabled) {
    console.log(...args);
  }
}

function _findWasmDir() {
  /* Get the directory of the current executable */
  const execPath = process.argv[1];
  const execDir = execPath ? path.dirname(execPath) : process.cwd();
  
  /* pkg-specific path resolution */
  const pkgEntry = process.pkg?.defaultEntry;
  const pkgDir = pkgEntry ? path.dirname(pkgEntry) : null;
  
  const candidates = [
    pkgDir, /* pkg executable directory (highest priority) */
    execDir, /* Same directory as the executable (index.mjs) */
    path.join(process.cwd()),
    path.join(process.cwd(), 'deps', 'ecm', 'wasm', 'build'),
    path.join(process.cwd(), 'dist'),
    path.join(process.cwd(), 'dist', 'package'),
    path.join(process.cwd(), 'dist', 'deps', 'ecm', 'wasm', 'build'),
  ];

  _debug('Executable path:', process.argv[1]);
  _debug('Current working directory:', process.cwd());
  _debug('pkg entry:', pkgEntry);
  _debug('pkg directory:', pkgDir);
  _debug('Searching in candidates:', candidates);

  for (const candidate of candidates) {
    /* Skip invalid paths */
    if (!candidate || candidate === '.' || candidate.length <= 1) {
      continue;
    }

    const normalizedCandidate = path.resolve(candidate);
    _debug('Checking normalized path:', normalizedCandidate);

    const unecm = {
      jsFile: path.join(normalizedCandidate, 'unecm.mjs'),
      wasmFile: path.join(normalizedCandidate, 'unecm.wasm'),
    };
    const ecm = {
      jsFile: path.join(normalizedCandidate, 'ecm.mjs'),
      wasmFile: path.join(normalizedCandidate, 'ecm.wasm'),
    };

    const exists = [
      existsSync(unecm.jsFile),
      existsSync(unecm.wasmFile),
      existsSync(ecm.jsFile),
      existsSync(ecm.wasmFile),
    ];

    if (exists.every(Boolean)) {
      return { unecm, ecm, path: normalizedCandidate };
    } else {
      _debug('WASM files not found in: ' + normalizedCandidate + ', ' + exists.map(Boolean).join(', '));
    }
  }

  throw new Error('Could not find WASM directory with required files, after searching: ' + candidates.join(', '));
}

function debugModule(module: any): void {
  _debug('Module type:', typeof module);
  _debug('Module keys:', Object.keys(module));
  _debug('Available functions:');
  for (const key of Object.keys(module)) {
    if (typeof module[key] === 'function') {
      _debug(`  ${key}: ${typeof module[key]}`);
    }
  }
  
  /* Check for specific functions we need */
  _debug('Checking for specific functions:');
  _debug('  _ecmify:', typeof module._ecmify);
  _debug('  _unecmify:', typeof module._unecmify);
  _debug('  FS:', typeof module.FS);
  if (module.FS) {
    _debug('  FS methods:', Object.keys(module.FS));
  }
}

async function loadECMModule(): Promise<ECMModule> {
  try {
    const wasmDirResult = _findWasmDir();
    if (!wasmDirResult) {
      throw new Error('Could not find WASM directory with required files');
    }
    
    /* Use the jsFile from the result, but try .mjs first, then fall back to .js */
    let wasmPath = wasmDirResult.ecm.jsFile;
    guard(existsSync(wasmPath), `ECM WASM file not found: ${wasmPath}`);
    _debug('Loading ECM WASM from:', wasmPath);
    
    /* Try different import strategies for compatibility */
    let importedModule;
    let createECMModule;
    
    /* Use require() for CJS compatibility with yao-pkg */
    try {
      importedModule = require(wasmPath);
      createECMModule = importedModule.default;
    } catch (importError) {
      console.error('Failed to import ECM module:', importError);
      throw new Error(`Failed to import ECM module from ${wasmPath}: ${importError instanceof Error ? importError.message : String(importError)}`);
    }
    
    if (typeof createECMModule !== 'function') {
      throw new Error(`createECMModule is not a function: ${typeof createECMModule}`);
    }
    
    _debug('ECM module loaded:', typeof importedModule);
    debugModule(importedModule);
    _debug('createECMModule:', typeof createECMModule);
    const module = await createECMModule();
    _debug('ECM module instance created');
    
    /* Wait for the module to be fully initialized */
    if (module.onRuntimeInitialized) {
      await new Promise<void>((resolve) => {
        module.onRuntimeInitialized = () => resolve();
      });
    }
    
    _debug('ECM module initialized');
    debugModule(module);
    return module;
  } catch (error) {
    console.error('Failed to load ECM module:', error);
    throw error;
  }
}

async function loadUNECMModule(): Promise<UNECMModule> {
  try {
    const wasmDirResult = _findWasmDir();
    if (!wasmDirResult) {
      throw new Error('Could not find WASM directory with required files');
    }
    
    /* Use the jsFile from the result, but try .mjs first, then fall back to .js */
    let wasmPath = wasmDirResult.unecm.jsFile;
    guard(existsSync(wasmPath), `UNECM WASM file not found: ${wasmPath}`);
    _debug('Loading UNECM WASM from:', wasmPath);
    
    /* Try different import strategies for compatibility */
    let importedModule;
    let createUNECMModule;
    
    /* Use require() for CJS compatibility with yao-pkg */
    try {
      importedModule = require(wasmPath);
      createUNECMModule = importedModule.default;
    } catch (importError) {
      console.error('Failed to import UNECM module:', importError);
      throw new Error(`Failed to import UNECM module from ${wasmPath}: ${importError instanceof Error ? importError.message : String(importError)}`);
    }
    
    if (typeof createUNECMModule !== 'function') {
      throw new Error(`createUNECMModule is not a function: ${typeof createUNECMModule}`);
    }
    
    _debug('UNECM module loaded:', typeof importedModule);
    debugModule(importedModule);
    _debug('createUNECMModule:', typeof createUNECMModule);
    const module = await createUNECMModule();
    _debug('UNECM module instance created');
    
    /* Wait for the module to be fully initialized */
    if (module.onRuntimeInitialized) {
      await new Promise<void>((resolve) => {
        module.onRuntimeInitialized = () => resolve();
      });
    }
    
    _debug('UNECM module initialized');
    debugModule(module);
    return module;
  } catch (error) {
    console.error('Failed to load UNECM module:', error);
    throw error;
  }
}

async function runECMCommand(module: ECMModule, inputPath: string, outputPath: string): Promise<void> {
  try {
    /* Read the input file */
    /* Use require() for CJS compatibility with yao-pkg */
    const fs = require('fs/promises');
    const inputData = await fs.readFile(inputPath);
    guard(inputData.length > 0, `ECM command failed to read input file: ${inputPath}`);

    /* Write input file to WASM virtual filesystem */
    const inputFileName = 'input.bin';
    const outputFileName = 'output.ecm';

    /* Write to virtual filesystem */
    module.FS.writeFile(inputFileName, inputData);

    /* Open files in WASM filesystem */
    const inStream = module.FS.open(inputFileName, 'r');
    const outStream = module.FS.open(outputFileName, 'w');

    /* Call ecmify function using ccall for better compatibility */
    let result: number;
    if (typeof module._ecmify === 'function') {
      /* Use direct function call if available */
      _debug('Using direct _ecmify function');
      result = module._ecmify(inStream.fd, outStream.fd);
    } else if (typeof module.ccall === 'function') {
      /* Fall back to ccall if direct function not available */
      _debug('Using ccall for ecmify');
      result = module.ccall('ecmify', 'number', ['number', 'number'], [inStream.fd, outStream.fd]);
    } else {
      throw new Error('Neither _ecmify function nor ccall is available in ECM module');
    }

    /* Don't close files here - the C code already closes them with fclose() */
    /* module.FS.close(inStream); */
    /* module.FS.close(outStream); */

    if (result !== 0) {
      throw new Error(`ECM command failed with exit code: ${result}`);
    }

    /* Read the output file from virtual filesystem */
    const outputData = module.FS.readFile(outputFileName);
    guard(outputData.length > 0, `ECM command failed to produce output file: ${outputFileName}`);

    /* Write to actual output path */
    await fs.writeFile(outputPath, outputData);

    /* Clean up virtual filesystem */
    try {
      module.FS.unlink(inputFileName);
      module.FS.unlink(outputFileName);
    } catch {
      /* Ignore cleanup errors */
    }
  } catch (error) {
    throw new Error(`ECM command execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runUNECMCommand(module: UNECMModule, inputPath: string, outputPath: string): Promise<void> {
  try {
    /* Read the input file */
    /* Use require() for CJS compatibility with yao-pkg */
    const fs = require('fs/promises');
    const inputData = await fs.readFile(inputPath);
    _debug('Input file read, size:', inputData.length);
    guard(inputData.length > 0, `UNECM command failed to read input file: ${inputPath}`);

    /* Write input file to WASM virtual filesystem */
    const inputFileName = 'input.ecm';
    const outputFileName = 'output.bin';

    /* Write to virtual filesystem */
    _debug('Writing to virtual filesystem:', inputFileName);
    module.FS.writeFile(inputFileName, inputData);

    /* Open files in WASM filesystem */
    _debug('Opening files in WASM filesystem');
    const inStream = module.FS.open(inputFileName, 'r');
    const outStream = module.FS.open(outputFileName, 'w');
    _debug('Files opened, inStream.fd:', inStream.fd, 'outStream.fd:', outStream.fd);

    /* Call unecmify function using ccall for better compatibility */
    _debug('Calling _unecmify using ccall...');
    _debug('Input file size in WASM:', module.FS.stat(inputFileName).size);
    
    let result: number;
    _debug('Checking _unecmify function availability...');
    _debug('typeof module._unecmify:', typeof module._unecmify);
    _debug('module._unecmify:', module._unecmify);
    
    if (typeof module._unecmify === 'function') {
      /* Use direct function call if available */
      _debug('Using direct _unecmify function');
      _debug('Calling module._unecmify with args:', inStream.fd, outStream.fd);
      result = module._unecmify(inStream.fd, outStream.fd);
      _debug('Direct _unecmify call completed, result:', result);
    } else if (typeof module.ccall === 'function') {
      /* Fall back to ccall if direct function not available */
      _debug('Using ccall for unecmify');
      _debug('Calling module.ccall with args:', 'unecmify', 'number', ['number', 'number'], [inStream.fd, outStream.fd]);
      result = module.ccall('unecmify', 'number', ['number', 'number'], [inStream.fd, outStream.fd]);
      _debug('ccall completed, result:', result);
    } else {
      throw new Error('Neither _unecmify function nor ccall is available in UNECM module');
    }
    _debug('UNECM result:', result);

    /* Don't close files here - the C code already closes them with fclose() */
    /* module.FS.close(inStream); */
    /* module.FS.close(outStream); */

    if (result !== 0) {
      throw new Error(`UNECM command failed with exit code: ${result}`);
    }

    /* Read the output file from virtual filesystem */
    _debug('Reading output from virtual filesystem');
    const outputData = module.FS.readFile(outputFileName);
    _debug('Output data size:', outputData.length);
    guard(outputData.length > 0, `UNECM command failed to produce output file: ${outputFileName}`);

    /* Write to actual output path */
    await fs.writeFile(outputPath, outputData);
    _debug('Output written to:', outputPath);

    /* Clean up virtual filesystem */
    try {
      module.FS.unlink(inputFileName);
      module.FS.unlink(outputFileName);
    } catch {
      /* Ignore cleanup errors */
    }
  } catch (error) {
    console.error('UNECM command error details:', error);
    throw new Error(`UNECM command execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export class EcmWasm {
  private ecmModule: ECMModule | null = null;
  private unecmModule: UNECMModule | null = null;

  async compress(inputPath: string, outputPath: string): Promise<void> {
    try {
      if (!this.ecmModule) {
        this.ecmModule = await loadECMModule();
      }
      await runECMCommand(this.ecmModule, inputPath, outputPath);
    } catch (error) {
      throw new Error(`ECM compression failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async extract(inputPath: string, outputPath: string): Promise<void> {
    try {
      if (!this.unecmModule) {
        this.unecmModule = await loadUNECMModule();
      }
      await runUNECMCommand(this.unecmModule, inputPath, outputPath);
    } catch (error) {
      throw new Error(`ECM extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async verify(inputPath: string): Promise<boolean> {
    try {
      if (!this.unecmModule) {
        this.unecmModule = await loadUNECMModule();
      }
      
      /* Create a temporary output file */
      const { mkdtemp, writeFile, unlink, rmdir } = require('fs/promises');
      const { join } = require('path');
      const { tmpdir } = require('os');
      
      const tempDir = await mkdtemp(path.join(tmpdir(), 'ecm-verify-'));
      const tempOutput = path.join(tempDir, 'temp_output.bin');
      
      try {
        await runUNECMCommand(this.unecmModule, inputPath, tempOutput);
        return true;
      } catch (error) {
        return false;
      } finally {
        try {
          await unlink(tempOutput);
          await rmdir(tempDir);
        } catch {
          /* Ignore cleanup errors */
        }
      }
    } catch (error) {
      throw new Error(`ECM verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 