import { defineConfig, transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Teaches Vite that `.js` files in the React directories contain JSX.
 *
 * Next compiles JSX inside plain `.js` without complaint, and this codebase relies on that
 * throughout. Vite does not, by design — it keys the parser off the file extension, and its
 * maintainers have declined to add a flag, so a plugin is the supported route.
 *
 * Scoped to `src/app` and `src/components` rather than all of `src`, deliberately. Every file in
 * those two trees is a React component; `src/lib` and `src/models` are CommonJS with no JSX, and
 * there is no reason to run them through a JSX parser. The alternative — sniffing each file for
 * something that looks like a tag — misfires on ordinary comparisons like `if (a <b)`.
 */
function jsxInJsFiles() {
  return {
    name: 'jsx-in-js-files',
    enforce: 'pre',
    async transform(code, id) {
      const path = id.split('?')[0];
      if (!path.endsWith('.js')) return null;
      if (!path.includes('/src/app/') && !path.includes('/src/components/')) return null;
      return transformWithOxc(code, path, { lang: 'jsx', jsx: { runtime: 'automatic' } });
    },
  };
}

/**
 * Component tests only.
 *
 * The pure-logic tests under `src/lib/*.test.js` stay on `node:test`: they need no DOM, no
 * transform, and no dependencies, and there is no reason to move 174 working tests onto a new
 * runner. Vitest is here for the one thing `node:test` genuinely cannot do — mock module
 * boundaries. Testing a page component means standing in for next-auth, next/navigation, and
 * `fetch`, and hand-rolling that in `node:test` is worse than running two runners with clearly
 * separate jobs.
 *
 * `npm test` runs both. The file naming keeps them from overlapping: `*.test.js` is node:test,
 * `*.test.jsx` is Vitest.
 */
export default defineConfig({
  plugins: [jsxInJsFiles(), react({ include: '**/*.{js,jsx}' })],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.jsx'],
    setupFiles: ['./vitest.setup.jsx'],
    globals: true,
    restoreMocks: true,
  },
});
