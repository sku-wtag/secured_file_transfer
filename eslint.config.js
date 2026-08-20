import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier/flat';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Single flat config for the whole monorepo. Blocks are ordered
 * general -> specific: shared baseline, then workspace-specific layers, then
 * `prettierConfig` last so no stylistic rule can fight the formatter.
 *
 * ESLint is held at v9: `eslint-plugin-react` and `eslint-plugin-jsx-a11y`
 * still declare peers only up to ^9, so moving to v10 today means dropping
 * accessibility linting. Revisit once both ship v10 support.
 */
export default tseslint.config(
  {
    name: 'app/ignores',
    ignores: ['**/dist/**', '**/build/**', '**/coverage/**', '**/node_modules/**', '**/*.min.js'],
  },

  // ---------------------------------------------------------------- baseline
  {
    name: 'app/baseline',
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    extends: [js.configs.recommended],
    plugins: { 'simple-import-sort': simpleImportSort },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      'no-implicit-coercion': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-return-await': 'off',
    },
  },

  // ------------------------------------------------- typescript, type-aware
  {
    name: 'app/typescript',
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        // Resolves each file against the nearest tsconfig, so the three
        // project configs (client app, client node, server) all work.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // `verbatimModuleSyntax` is on, so type-only imports must be explicit.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // JSX attributes routinely take async handlers whose promise is ignored.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
    },
  },

  // -------------------------------------------------------------- client (react)
  {
    name: 'app/client',
    files: ['client/**/*.{ts,tsx}'],
    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      jsxA11y.flatConfigs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    plugins: { 'react-refresh': reactRefresh },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // TypeScript already checks props; prop-types would be duplicate work.
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': ['error', { allowReferrer: false }],
      'react/self-closing-comp': 'error',
      'react/jsx-boolean-value': ['error', 'never'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // -------------------------------------------------------------- server (node)
  {
    name: 'app/server',
    files: ['server/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      // The server logs to stdout/stderr by design.
      'no-console': 'off',
    },
  },

  // --------------------------------------------- plain JS config files
  {
    name: 'app/config-files',
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  prettierConfig,
);
