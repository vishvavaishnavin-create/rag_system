import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// defineConfig gives TypeScript autocompletion for all Vite options
export default defineConfig({
  plugins: [react()],
})
