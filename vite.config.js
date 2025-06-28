import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    
    allowedHosts: ['b4fd-117-55-242-131.ngrok-free.app'],
    allowedHosts: ['55b3-117-55-242-134.ngrok-free.app'],
    allowedHosts: ['4b13-117-55-242-131.ngrok-free.app'],
  }
})
