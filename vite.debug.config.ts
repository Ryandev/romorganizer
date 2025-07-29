import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'copy-wasm-files',
      writeBundle() {
        const wasmSourceDir = join(__dirname, 'deps', 'ecm', 'wasm', 'build');
        const wasmDestDir = join(__dirname, 'dist', 'deps', 'ecm', 'wasm', 'build');
        
        // Create destination directory
        if (!existsSync(wasmDestDir)) {
          mkdirSync(wasmDestDir, { recursive: true });
        }
        
        // Copy WASM files
        const files = ['ecm.js', 'ecm.wasm', 'unecm.js', 'unecm.wasm'];
        files.forEach(file => {
          const sourcePath = join(wasmSourceDir, file);
          const destPath = join(wasmDestDir, file);
          if (existsSync(sourcePath)) {
            copyFileSync(sourcePath, destPath);
            console.log(`Copied ${file} to dist`);
          }
        });
      }
    }
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '7zTools',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        'command-line-args', 
        'archiver', 
        'extract-zip', 
        'zx',
        'node:fs',
        'node:fs/promises',
        'node:path',
        'node:os',
        'node:child_process',
        'node:util',
        'node:events',
        'node:timers',
        'node:url',
        'node:crypto',
        'node:zlib',
        'fs',
        'path',
        'os',
        'child_process',
        'util',
        'events',
        'url',
        'crypto',
        'zlib'
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  esbuild: {
    target: 'ES2022'
  },
  define: {
    __DEV__: true
  },
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['deps/ecm/wasm/build/*.js']
  },
  ssr: {
    noExternal: ['deps/ecm/wasm/build/*.js']
  }
}); 