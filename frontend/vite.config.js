import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Same path prefixes as nginx.conf, so the app never needs CORS or absolute API URLs.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/endorsement-api': {
        target: process.env.ENDORSEMENT_API_URL ?? 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/endorsement-api/, ''),
      },
      '/routes-api': {
        target: process.env.ROUTES_API_URL ?? 'http://localhost:8080',
        rewrite: (path) => path.replace(/^\/routes-api/, ''),
      },
    },
  },
});
