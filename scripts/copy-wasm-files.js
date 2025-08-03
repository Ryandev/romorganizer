import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Copies WASM files from source to destination directory
 * @param {string} sourceDir - Source directory containing WASM files
 * @param {string} destDir - Destination directory to copy WASM files to
 * @param {string} logPrefix - Prefix for console log messages
 */
export function copyWasmFiles(sourceDir, destDir, logPrefix = '') {
  /* Create destination directory */
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  
  /* Copy WASM files */
  const files = ['ecm.mjs', 'ecm.wasm', 'unecm.mjs', 'unecm.wasm'];
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    if (existsSync(sourcePath)) {
      copyFileSync(sourcePath, destPath);
      console.log(`${logPrefix}Copied ${file} to ${destDir}`);
    }
  });
}

/**
 * Copies WASM files and renames .js files to .mjs for module compatibility
 * @param {string} sourceDir - Source directory containing WASM files
 * @param {string} destDir - Destination directory to copy WASM files to
 * @param {string} logPrefix - Prefix for console log messages
 */
export function copyWasmFilesWithMjsRename(sourceDir, destDir, logPrefix = '') {
  /* Create destination directory */
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  
  /* Copy WASM files and rename .js to .mjs */
  const files = ['ecm.js', 'ecm.wasm', 'unecm.js', 'unecm.wasm'];
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    let destFileName = file;
    
    /* Rename .js files to .mjs for module compatibility */
    if (file.endsWith('.js')) {
      destFileName = file.replace('.js', '.mjs');
    }
    
    const destPath = path.join(destDir, destFileName);
    if (existsSync(sourcePath)) {
      copyFileSync(sourcePath, destPath);
      console.log(`${logPrefix}Copied ${file} to ${destDir} as ${destFileName}`);
    }
  });
}

/**
 * Creates a Vite plugin for copying WASM files
 * @param {string} sourceDir - Source directory containing WASM files
 * @param {string} destDir - Destination directory to copy WASM files to
 * @param {string} logPrefix - Prefix for console log messages
 * @returns {Object} Vite plugin object
 */
export function createWasmCopyPlugin(sourceDir, destDir, logPrefix = '') {
  return {
    name: 'copy-wasm-files',
    writeBundle() {
      copyWasmFiles(sourceDir, destDir, logPrefix);
    }
  };
}

/**
 * Creates a Vite plugin for copying WASM files with .mjs rename
 * @param {string} sourceDir - Source directory containing WASM files
 * @param {string} destDir - Destination directory to copy WASM files to
 * @param {string} logPrefix - Prefix for console log messages
 * @returns {Object} Vite plugin object
 */
export function createWasmCopyPluginWithMjsRename(sourceDir, destDir, logPrefix = '') {
  return {
    name: 'copy-wasm-files-with-mjs-rename',
    writeBundle() {
      copyWasmFilesWithMjsRename(sourceDir, destDir, logPrefix);
    }
  };
} 