import path from 'path'

import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ command, mode }) => {
  const isUIBuild = process.env.BUILD_TARGET === 'ui'

  if (isUIBuild) {
    // UI build configuration
    return {
      plugins: [viteSingleFile()],
      root: 'src',
      build: {
        emptyOutDir: false,
        rollupOptions: {
          input: path.resolve(__dirname, 'src/ui.html'),
        },
        outDir: '../dist',
        target: 'es2020',
        minify: false,
      },
    }
  } else {
    // Code build configuration
    return {
      build: {
        emptyOutDir: false,
        lib: {
          entry: path.resolve(__dirname, 'src/code.ts'),
          name: 'code',
          fileName: 'code',
          formats: ['es'],
        },
        rollupOptions: {
          output: {
            dir: 'dist',
            entryFileNames: '[name].js',
          },
        },
        target: 'es2020',
        minify: false,
      },
    }
  }
})
