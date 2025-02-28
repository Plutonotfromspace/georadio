import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Add this line to expose to all network interfaces
    port: 5173  // Specify the port explicitly
  },
  base: '/'
})
