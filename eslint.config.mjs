import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

const eslintConfig = defineConfig([
  globalIgnores(['dist/**', 'dist-ssr/**', 'coverage/**', '.vite/**', '.tmp/**']),
  js.configs.recommended,
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['src/**/*.{js,ts}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/engine/**/*.{js,ts,mjs,mts,cjs,cts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)(game(/|$)|main(\\.[^/]+)?$)',
              message: 'Engine must not depend on game code or the application entry point.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression[source.value=/(^|\\/)(game(\\/|$)|main(\\.[^/]+)?$)/]',
          message: 'Engine must not dynamically import game code or the application entry point.',
        },
      ],
    },
  },
  {
    files: ['*.config.{js,mjs,cjs,ts,mts,cts}', 'scripts/**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
])

export default eslintConfig
