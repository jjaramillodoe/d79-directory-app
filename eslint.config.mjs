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
    // `src/lib` and `src/models` are CommonJS while routes, components, and pages are ESM,
    // and both live under .js here, so both sets of globals have to be available.
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

      // `console.log` is almost always debug tracing someone forgot to remove, and in client
      // code it ships to every user's browser console. Use `logger.debug` instead, which
      // compiles out in production, or `reportError` on the server.
      //
      // `warn` and `error` stay allowed on purpose: a database retry or a Redis outage is a
      // real operational signal that belongs in the platform logs, and the handful of places
      // that use them are documented at the call site.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

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
    // Test files and node scripts run outside the browser. For the CLI scripts in particular,
    // printing to stdout is the whole interface, and `logger.js` is the implementation the
    // rule exists to point people at.
    files: [
      '**/*.test.js',
      'src/scripts/**/*.js',
      'scripts/**/*.js',
      'src/lib/logger.js',
    ],
    rules: {
      'no-console': 'off',
    },
  },
];

export default config;
