import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs on :3000; Vite proxies to it so cookies stay same-origin
// (exactly like Netlify does in production).
const API = process.env.API_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/uploads': { target: API, changeOrigin: true },
    },
  },
});
