import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: false,
    // Vite v4: server.watch controls chokidar options.
    // usePolling bypasses fs.watch entirely, avoiding the EBUSY crash on Windows.
    watch: {
      usePolling: true,
      interval: 500,
      binaryInterval: 500,
      ignored: (watchedPath: string) =>
        /src-tauri[/\\]target/.test(watchedPath) ||
        /\.git[/\\]/.test(watchedPath) ||
        /\.(dll|pdb|rlib|so|dylib)$/i.test(watchedPath),
    },
  },
  // Top-level watch is silently ignored by Vite v4, only server.watch is used.
})
