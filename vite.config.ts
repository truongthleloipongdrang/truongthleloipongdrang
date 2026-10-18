import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({command}) => {
  return {
    // Base path: '/truongthleloipongdrang/' for GitHub Actions Pages, './' for Google AI Studio / universal builds, '/' for local dev server
    base: process.env.VITE_BASE_PATH || (command === 'serve' ? '/' : (process.env.GITHUB_ACTIONS === 'true' ? '/truongthleloipongdrang/' : './')),
    plugins: [react(), tailwindcss()],
    define: {
      __IS_PRODUCTION_BUILD__: JSON.stringify(command === 'build'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
