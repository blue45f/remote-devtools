import mkcert from 'vite-plugin-mkcert'
import * as path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      mkcert({
        certFileName: `${process.cwd()}/localhost+3.pem`,
        keyFileName: `${process.cwd()}/localhost+3-key.pem`,
      }),
    ],
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router'],
            antd: ['antd', '@ant-design/icons'],
            charts: ['recharts'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: env.VITE_DEV_HOST || 'localhost',
    },
  }
})
