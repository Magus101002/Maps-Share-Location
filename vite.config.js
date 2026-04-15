import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Force single copy resolution to avoid invalid hook calls / duplicate emotion
      react: path.resolve(__dirname, 'node_modules', 'react'),
      'react-dom': path.resolve(__dirname, 'node_modules', 'react-dom'),
      '@emotion/react': path.resolve(__dirname, 'node_modules', '@emotion', 'react')
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@emotion/react']
  },
  server: {
    port: 5173
  }
})

