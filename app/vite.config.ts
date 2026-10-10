import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  // COACH_* : configuration Supabase définie dans netlify.toml
  envPrefix: ['VITE_', 'COACH_'],
})
