import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('.', import.meta.url))
  const env = loadEnv(mode, root, 'VITE_')
  const environment = env.VITE_ENVIRONMENT ?? (mode === 'production' ? 'production' : 'development')

  if (environment !== 'development' && environment !== 'production') {
    throw new Error('VITE_ENVIRONMENT must be development or production')
  }

  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      'import.meta.env.VITE_ENVIRONMENT': JSON.stringify(environment),
    },
  }
})
