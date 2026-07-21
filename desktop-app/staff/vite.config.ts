import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  // Prevent Vite from watching Rust build artifacts.
  // Rust compilation creates/locks .dll, .pdb, .rlib files in src-tauri/target/,
  // and Windows chokidar watcher crashes with EBUSY when trying to watch locked files.
  // This also prevents OneDrive from triggering sync on every build artifact change.
  watch: {
    ignored: [
      '**/src-tauri/target/**',   // Rust build artifacts (DLLs, .rlib, .pdb, .d files)
      '**/.git/**',                // Git internals (safety, though Vite ignores by default)
    ],
  },
});
