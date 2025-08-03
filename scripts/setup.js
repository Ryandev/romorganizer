#!/usr/bin/env node
/* eslint-env node */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const ecmRoot = join(projectRoot, 'deps', 'ecm');
const emsdkPath = join(ecmRoot, 'emsdk');
const emccPath = join(emsdkPath, 'upstream', 'emscripten', 'emcc');

console.log('🔧 Setting up development environment...');

/* Check if emsdk is already installed and properly configured */
function checkEmsdk() {
  try {
    if (!existsSync(emsdkPath)) {
      return false;
    }
    
    if (!existsSync(emccPath)) {
      return false;
    }
    
    /* Test if emcc is working */
    execSync(`"${emccPath}" --version`, {
      stdio: 'pipe',
      env: { ...process.env, EMSDK_PYTHON: process.env.EMSDK_PYTHON || 'python3' }
    });
    
    return true;
  } catch {
    return false;
  }
}

/* Install and configure emsdk */
function installEmsdk() {
  console.log('📦 Installing emsdk...');
  
  try {
    /* Clone emsdk if it doesn't exist */
    if (!existsSync(emsdkPath)) {
      console.log('Cloning emsdk repository...');
      execSync('git clone https://github.com/emscripten-core/emsdk.git', {
        stdio: 'inherit',
        cwd: ecmRoot
      });
    }
    
    /* Install latest emsdk */
    console.log('Installing latest emsdk...');
    execSync('./emsdk install latest', {
      stdio: 'inherit',
      cwd: emsdkPath
    });
    
    /* Activate latest emsdk */
    console.log('Activating emsdk...');
    execSync('./emsdk activate latest', {
      stdio: 'inherit',
      cwd: emsdkPath
    });
    
    console.log('✅ emsdk installed and activated successfully');
  } catch (error) {
    console.error('❌ Failed to install emsdk:', error.message);
    throw new Error('Failed to install emsdk');
  }
}

/* Main setup process */
async function main() {
  console.log('Checking emsdk installation...');
  
  if (checkEmsdk()) {
    console.log('✅ emsdk is already installed and configured');
  } else {
    console.log('❌ emsdk is not properly installed or configured');
    installEmsdk();
  }
  
  console.log('🎉 Setup completed successfully!');
  console.log('You can now run: yarn build:deps');
}

main().catch((error) => {
  console.error('❌ Setup failed:', error.message);
  throw new Error('Setup failed');
}); 