import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function tossDemoEntry(): Plugin {
  return {
    name: 'toss-demo-entry',
    closeBundle() {
      const outputDirectory = resolve('dist')
      const tossDirectory = resolve(outputDirectory, 'toss')

      mkdirSync(tossDirectory, { recursive: true })
      copyFileSync(resolve(outputDirectory, 'index.html'), resolve(tossDirectory, 'index.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/meetcue/',
  plugins: [react(), tailwindcss(), tossDemoEntry()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
