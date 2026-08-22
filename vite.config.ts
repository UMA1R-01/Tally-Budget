import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  // Relative asset paths so the built bundle works from Tauri's asset protocol
  // (and from any file:// or sub-path deployment) without rewriting URLs.
  base: './',
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true, // bind all interfaces (IPv4 + IPv6) so localhost resolves either way
    port: 5173,
    strictPort: true, // Tauri's devUrl points at a fixed port
    watch: {
      // Cargo's build output churns constantly and Windows locks files mid-write;
      // watching it crashes Vite's watcher (EBUSY) once the Rust build gets going.
      ignored: ['**/src-tauri/**'],
    },
  },
  clearScreen: false,
})
