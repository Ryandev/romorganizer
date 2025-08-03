import path from 'node:path';
import { existsSync } from 'node:fs';
import type { ECMModule, UNECMModule } from '../types.js';

function guard(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function getWasmDir(): string {
  /* Check if we're running from the built version (dist directory) */
  const distPath = path.join(process.cwd(), 'dist', 'deps', 'ecm', 'wasm', 'build');
  const sourcePath = path.join(process.cwd(), 'deps', 'ecm', 'wasm', 'build');
  
  /* For debugging, let's check both paths */
  console.log('Checking paths:');
  console.log('  distPath:', distPath);
  console.log('  sourcePath:', sourcePath);
  
  /* Try to use dist path if it exists and has the files */
  try {
    if ((existsSync(path.join(distPath, 'unecm.mjs')) || existsSync(path.join(distPath, 'unecm.js'))) && 
        existsSync(path.join(distPath, 'unecm.wasm'))) {
      console.log('Using dist path');
      return distPath;
    }
  } catch (e) {
    /* Ignore errors */
  }
  
  /* Check if we're running from a packaged executable */
  try {
    const { dirname } = require('path');
    const { fileURLToPath } = require('url');
    const executablePath = process.execPath;
    const executableDir = dirname(executablePath);
    const packagedPath = path.join(executableDir, 'deps', 'ecm', 'wasm', 'build');
    
    if ((existsSync(path.join(packagedPath, 'unecm.mjs')) || existsSync(path.join(packagedPath, 'unecm.js'))) && 
        existsSync(path.join(packagedPath, 'unecm.wasm'))) {
      console.log('Using packaged path');
      return packagedPath;
    }
  } catch (e) {
    /* Ignore errors */
  }
  
  /* Check if we're running from the bundled package (ncc output) or current working directory */
  try {
    const packagePath = path.join(process.cwd(), 'deps', 'ecm', 'wasm', 'build');
    /* Check for both .mjs and .js files */
    if ((existsSync(path.join(packagePath, 'unecm.mjs')) || existsSync(path.join(packagePath, 'unecm.js'))) && 
        existsSync(path.join(packagePath, 'unecm.wasm'))) {
      console.log('Using package/current working directory path');
      return packagePath;
    }
  } catch (e) {
    /* Ignore errors */
  }
  
  console.log('Using source path');
  return sourcePath;
}

function debugModule(module: any): void {
  console.log('Module type:', typeof module);
  console.log('Module keys:', Object.keys(module));
  console.log('Available functions:');
  for (const key of Object.keys(module)) {
    if (typeof module[key] === 'function') {
      console.log(`  ${key}: ${typeof module[key]}`);
    }
  }
  
  /* Check for specific functions we need */
  console.log('Checking for specific functions:');
  console.log('  _ecmify:', typeof module._ecmify);
  console.log('  _unecmify:', typeof module._unecmify);
  console.log('  FS:', typeof module.FS);
  if (module.FS) {
    console.log('  FS methods:', Object.keys(module.FS));
  }
}

async function loadECMModule(): Promise<ECMModule> {
  try {
    const wasmDir = getWasmDir();
    /* Try .mjs first, then fall back to .js */
    let wasmPath = path.join(wasmDir, 'ecm.mjs');
    if (!existsSync(wasmPath)) {
      wasmPath = path.join(wasmDir, 'ecm.js');
    }
    console.log('Loading ECM WASM from:', wasmPath);
    
    /* Try different import strategies for compatibility */
    let importedModule;
    let createECMModule;
    
    /* Import the ES module directly */
    importedModule = await import(wasmPath);
    createECMModule = importedModule.default;
    
    if (typeof createECMModule !== 'function') {
      throw new Error(`createECMModule is not a function: ${typeof createECMModule}`);
    }
    
    console.log('ECM module loaded:', typeof importedModule);
    debugModule(importedModule);
    console.log('createECMModule:', typeof createECMModule);
    const module = await createECMModule();
    console.log('ECM module instance created');
    
    /* Wait for the module to be fully initialized */
    if (module.onRuntimeInitialized) {
      await new Promise<void>((resolve) => {
        module.onRuntimeInitialized = () => resolve();
      });
    }
    
    console.log('ECM module initialized');
    debugModule(module);
    return module;
  } catch (error) {
    console.error('Failed to load ECM module:', error);
    throw error;
  }
}

async function loadUNECMModule(): Promise<UNECMModule> {
  try {
    const wasmDir = getWasmDir();
    /* Try .mjs first, then fall back to .js */
    let wasmPath = path.join(wasmDir, 'unecm.mjs');
    if (!existsSync(wasmPath)) {
      wasmPath = path.join(wasmDir, 'unecm.js');
    }
    console.log('Loading UNECM WASM from:', wasmPath);
    
    /* Try different import strategies for compatibility */
    let importedModule;
    let createUNECMModule;
    
    /* Import the ES module directly */
    importedModule = await import(wasmPath);
    createUNECMModule = importedModule.default;
    
    if (typeof createUNECMModule !== 'function') {
      throw new Error(`createUNECMModule is not a function: ${typeof createUNECMModule}`);
    }
    
    console.log('UNECM module loaded:', typeof importedModule);
    debugModule(importedModule);
    console.log('createUNECMModule:', typeof createUNECMModule);
    const module = await createUNECMModule();
    console.log('UNECM module instance created');
    
    /* Wait for the module to be fully initialized */
    if (module.onRuntimeInitialized) {
      await new Promise<void>((resolve) => {
        module.onRuntimeInitialized = () => resolve();
      });
    }
    
    console.log('UNECM module initialized');
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
    const { readFile } = await import('fs/promises');
    const inputData = await readFile(inputPath);
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
    const result = module.ccall('ecmify', 'number', ['number', 'number'], [inStream.fd, outStream.fd]);

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
    const { writeFile } = await import('fs/promises');
    await writeFile(outputPath, outputData);

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
    const { readFile } = await import('fs/promises');
    const inputData = await readFile(inputPath);
    console.log('Input file read, size:', inputData.length);
    guard(inputData.length > 0, `UNECM command failed to read input file: ${inputPath}`);

    /* Write input file to WASM virtual filesystem */
    const inputFileName = 'input.ecm';
    const outputFileName = 'output.bin';

    /* Write to virtual filesystem */
    console.log('Writing to virtual filesystem:', inputFileName);
    module.FS.writeFile(inputFileName, inputData);

    /* Open files in WASM filesystem */
    console.log('Opening files in WASM filesystem');
    const inStream = module.FS.open(inputFileName, 'r');
    const outStream = module.FS.open(outputFileName, 'w');
    console.log('Files opened, inStream.fd:', inStream.fd, 'outStream.fd:', outStream.fd);

    /* Call unecmify function using ccall for better compatibility */
    console.log('Calling _unecmify using ccall...');
    console.log('Input file size in WASM:', module.FS.stat(inputFileName).size);
    
    const result = module.ccall('unecmify', 'number', ['number', 'number'], [inStream.fd, outStream.fd]);
    console.log('UNECM result:', result);

    /* Don't close files here - the C code already closes them with fclose() */
    /* module.FS.close(inStream); */
    /* module.FS.close(outStream); */

    if (result !== 0) {
      throw new Error(`UNECM command failed with exit code: ${result}`);
    }

    /* Read the output file from virtual filesystem */
    console.log('Reading output from virtual filesystem');
    const outputData = module.FS.readFile(outputFileName);
    console.log('Output data size:', outputData.length);
    guard(outputData.length > 0, `UNECM command failed to produce output file: ${outputFileName}`);

    /* Write to actual output path */
    const { writeFile } = await import('fs/promises');
    await writeFile(outputPath, outputData);
    console.log('Output written to:', outputPath);

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
      const { mkdtemp, writeFile, unlink, rmdir } = await import('fs/promises');
      const { join } = await import('path');
      const { tmpdir } = await import('os');
      
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