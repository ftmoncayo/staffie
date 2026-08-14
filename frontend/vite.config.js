import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Exposes env vars prefixed with VITE_ (e.g. VITE_API_URL) to frontend code via import.meta.env
  envPrefix: 'VITE_',
})
