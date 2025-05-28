import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    allowedHosts: ['d9dc-49-36-177-208.ngrok-free.app'],
    allowedHosts: ['de69-49-36-177-208.ngrok-free.app'],
    allowedHosts: ['6467-49-36-177-208.ngrok-free.app'],
    }
})
