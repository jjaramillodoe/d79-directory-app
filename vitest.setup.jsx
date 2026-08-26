import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * Stubs the Once UI design system for every component test.
 *
 * Two reasons, and the second is what forces it. First, these tests are about application
 * logic — which requests fire, what data flows where, who is allowed to edit — and rendering the
 * real design system would test someone else's library on every run. Second,
 * `@once-ui-system/core` does not resolve under Vite at all: its compiled files import a path
 * that lands at `dist/dist/index.js`, a packaging bug in the published package.
 *
 * The list is explicit rather than a Proxy because Vitest validates a mock's exports by
 * enumeration, and a Proxy cannot answer that honestly. It was generated from the imports across
 * `src/`, so if a test ever fails with "No X export is defined", add X here.
 */
const ONCE_UI_COMPONENTS = [
  'Badge',
  'Button',
  'Card',
  'Column',
  'Flex',
  'Grid',
  'Heading',
  'IconButton',
  'ProgressBar',
  'Row',
  'SegmentedControl',
  'SmartLink',
  'Spinner',
  'Tag',
  'Text',
  'ThemeInit',
];

// Providers have to render children or every tree under them disappears.
const ONCE_UI_PROVIDERS = [
  'DataThemeProvider',
  'IconProvider',
  'LayoutProvider',
  'ThemeProvider',
  'ToastProvider',
];

vi.mock('@once-ui-system/core', () => {
  const stub = (name) => {
    const Stub = ({ children, ...rest }) => {
      // Reflecting arbitrary props would put objects and handlers into DOM attributes and flood
      // the output with React warnings, so only the few string props tests care about pass through.
      const safe = {};
      if (typeof rest.id === 'string') safe.id = rest.id;
      if (typeof rest.href === 'string') safe.href = rest.href;
      return (
        <div data-once-ui={name} {...safe}>
          {children}
        </div>
      );
    };
    Stub.displayName = `OnceUI.${name}`;
    return Stub;
  };

  const mod = {};
  for (const name of [...ONCE_UI_COMPONENTS, ...ONCE_UI_PROVIDERS]) {
    mod[name] = stub(name);
  }

  mod.useToast = () => ({ addToast: vi.fn(), removeToast: vi.fn() });
  mod.useLayout = () => ({ isMobile: false, isTablet: false, isDesktop: true });

  return mod;
});

// jsdom implements neither of these, and Once UI's components call both during layout.
// Without them the render throws before any assertion runs.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (!global.ResizeObserver) {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
