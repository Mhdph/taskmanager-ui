import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', '.svelte-kit/', '.vercel/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } },
    rules: {
      // Legacy-migration code is intentionally loose; new code should still
      // prefer precise types. `check` (svelte-check) is the type gate.
      '@typescript-eslint/no-explicit-any': 'off',
      // `SSR_GUARD && ...` short-circuits keep modules import-safe for builds.
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
    },
  },
  {
    // Svelte 5 runes are compiler-provided globals in `.svelte.ts` modules.
    files: ['**/*.svelte.ts'],
    languageOptions: {
      globals: {
        $state: 'readonly',
        $derived: 'readonly',
        $effect: 'readonly',
        $props: 'readonly',
        $inspect: 'readonly',
        $host: 'readonly',
      },
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
);
