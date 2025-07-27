#!/usr/bin/env node
/* eslint-env node */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const depsRoot = __dirname;
const projectRoot = join(depsRoot, '..');

console.log('Building dependencies...');

// Build ECM WASM modules via local script
try {
  execSync('node deps/ecm/build.js', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: process.env
  });
} catch (error) {
  console.error('❌ Failed to build ECM WASM modules:', error.message);
  process.exit(1);
}

console.log('🎉 All dependencies built successfully!'); 