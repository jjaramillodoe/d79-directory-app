import next from 'eslint-config-next';

// Pinned to ESLint 9: eslint-config-next 16.x ships a parser that ESLint 10 rejects
// with "scopeManager.addGlobals is not a function".
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
      'docs/**',
    ],
  },

  ...next,

  {
    // API routes and lib modules are CommonJS while components and pages are ESM, and
    // both live under .js here, so both sets of globals have to be available.
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'writable',
      },
    },
    rules: {
      // Unescaped apostrophes in JSX text render correctly and read better in source
      // than &apos;. The rule produced 28 findings, none of them defects.
      'react/no-unescaped-entities': 'off',

      // React Compiler rules. These flag real problems, but each fix is a component
      // refactor rather than a local edit, and there are ~60 of them concentrated in
      // the oversized page components the audit already calls out for splitting.
      // Kept as warnings so they stay visible in every lint run and in CI output
      // without blocking the pipeline on day one; the intent is to burn them down and
      // then promote them back to errors.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },

  {
    // Test files and node scripts run outside the browser.
    files: ['**/*.test.js', 'src/scripts/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
];

export default config;
