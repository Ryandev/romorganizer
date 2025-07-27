import { join } from 'path';
import type { ECMModule, UNECMModule } from '../types.js';

function getWasmDir(): string {
  // Use a simple approach that works with Jest
  return join(process.cwd(), 'deps', 'ecm', 'wasm', 'build');
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
  
  // Check for specific functions we need
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
    const wasmPath = join(getWasmDir(), 'ecm.js');
    console.log('Loading ECM WASM from:', wasmPath);
    const importedModule = await import(wasmPath);
    console.log('ECM module loaded:', typeof importedModule);
    debugModule(importedModule);
    const createECMModule = importedModule.default;
    console.log('createECMModule:', typeof createECMModule);
    const module = await createECMModule();
    console.log('ECM module instance created');
    
    // Wait for the module to be fully initialized
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
    const wasmPath = join(getWasmDir(), 'unecm.js');
    console.log('Loading UNECM WASM from:', wasmPath);
    const importedModule = await import(wasmPath);
    console.log('UNECM module loaded:', typeof importedModule);
    debugModule(importedModule);
    const createUNECMModule = importedModule.default;
    console.log('createUNECMModule:', typeof createUNECMModule);
    const module = await createUNECMModule();
    console.log('UNECM module instance created');
    
    // Wait for the module to be fully initialized
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
    // Read the input file
    const { readFile } = await import('fs/promises');
    const inputData = await readFile(inputPath);

    // Write input file to WASM virtual filesystem
    const inputFileName = 'input.bin';
    const outputFileName = 'output.ecm';

    // Write to virtual filesystem
    module.FS.writeFile(inputFileName, inputData);

    // Open files in WASM filesystem
    const inStream = module.FS.open(inputFileName, 'r');
    const outStream = module.FS.open(outputFileName, 'w');

    // Call ecmify function directly
    const result = module._ecmify(inStream.fd, outStream.fd);

    // Don't close files here - the C code already closes them with fclose()
    // module.FS.close(inStream);
    // module.FS.close(outStream);

    if (result !== 0) {
      throw new Error(`ECM command failed with exit code: ${result}`);
    }

    // Read the output file from virtual filesystem
    const outputData = module.FS.readFile(outputFileName);

    // Write to actual output path
    const { writeFile } = await import('fs/promises');
    await writeFile(outputPath, outputData);

    // Clean up virtual filesystem
    try {
      module.FS.unlink(inputFileName);
      module.FS.unlink(outputFileName);
    } catch {
      // Ignore cleanup errors
    }
  } catch (error) {
    throw new Error(`ECM command execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runUNECMCommand(module: UNECMModule, inputPath: string, outputPath: string): Promise<void> {
  try {
    // Read the input file
    const { readFile } = await import('fs/promises');
    const inputData = await readFile(inputPath);

    // Write input file to WASM virtual filesystem
    const inputFileName = 'input.ecm';
    const outputFileName = 'output.bin';

    // Write to virtual filesystem
    module.FS.writeFile(inputFileName, inputData);

    // Open files in WASM filesystem
    const inStream = module.FS.open(inputFileName, 'r');
    const outStream = module.FS.open(outputFileName, 'w');

    // Call unecmify function directly
    const result = module._unecmify(inStream.fd, outStream.fd);

    // Don't close files here - the C code already closes them with fclose()
    // module.FS.close(inStream);
    // module.FS.close(outStream);

    if (result !== 0) {
      throw new Error(`UNECM command failed with exit code: ${result}`);
    }

    // Read the output file from virtual filesystem
    const outputData = module.FS.readFile(outputFileName);

    // Write to actual output path
    const { writeFile } = await import('fs/promises');
    await writeFile(outputPath, outputData);

    // Clean up virtual filesystem
    try {
      module.FS.unlink(inputFileName);
      module.FS.unlink(outputFileName);
    } catch {
      // Ignore cleanup errors
    }
  } catch (error) {
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
      
      // Create a temporary output file
      const { mkdtemp, writeFile, unlink, rmdir } = await import('fs/promises');
      const { join } = await import('path');
      const { tmpdir } = await import('os');
      
      const tempDir = await mkdtemp(join(tmpdir(), 'ecm-verify-'));
      const tempOutput = join(tempDir, 'temp_output.bin');
      
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
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      throw new Error(`ECM verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 