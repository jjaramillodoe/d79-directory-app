const path = require('path');

const PDF_EXTERNALS = ['pdfkit', 'fontkit', 'iconv-lite'];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin workspace root so Next.js ignores the stray lockfile in the home directory
  outputFileTracingRoot: path.join(__dirname),
  typescript: {
    ignoreBuildErrors: false,
  },
  // Keep pdfkit/fontkit out of the Turbopack/webpack graph. Their ESM builds
  // import applyDecoratedDescriptor from @swc/helpers, which Next 16 does not export.
  serverExternalPackages: [...PDF_EXTERNALS, 'ioredis'],
  // No `experimental.optimizePackageImports` here, deliberately. Next 16 already optimizes
  // `lucide-react` and `recharts` by default, and adding `@once-ui-system/core` (65 importers,
  // no `sideEffects` flag) measured 7760 KB -> 7736 KB of client chunks, a 0.3% change. Not
  // worth an experimental flag the Next docs say is not recommended for production. Revisit
  // only with bundle-analyzer evidence that the barrel is actually costing something.
  turbopack: {
    root: path.join(__dirname),
    resolveAlias: {
      '@': './src',
      '@/*': './src/*',
    },
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };

    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push(...PDF_EXTERNALS);
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = [
          originalExternals,
          (context, request, callback) => {
            if (PDF_EXTERNALS.includes(request)) {
              return callback(null, `commonjs ${request}`);
            }
            callback();
          },
        ];
      } else {
        config.externals = {
          ...config.externals,
          pdfkit: 'commonjs pdfkit',
          fontkit: 'commonjs fontkit',
          'iconv-lite': 'commonjs iconv-lite',
        };
      }
    }

    return config;
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';

    // `'unsafe-eval'` is a development-only allowance. React Refresh and the Turbopack dev
    // runtime both evaluate code at runtime, so `next dev` needs it; a production build does
    // not, and leaving it on would hand any future XSS a direct path to eval().
    //
    // `'unsafe-inline'` stays, as a decision rather than an oversight. The clean fix is a
    // per-request nonce, which costs two things here:
    //
    //   1. A nonce cannot be baked into a prerendered page, and 16 of this app's 19 pages are
    //      prerendered — including `/`, `/about`, and `/login`. Reading a nonce in the root
    //      layout pushes all of them into dynamic rendering.
    //   2. `ThemeInit` from @once-ui-system/core injects an inline script and takes no nonce
    //      prop. A nonce policy makes the browser ignore `'unsafe-inline'`, so there is no way
    //      to keep both — adopting nonces means replacing that third-party script locally.
    //
    // Hashes are not an escape: Next's streaming `self.__next_f.push` scripts differ per page
    // and per render. Weighed against no known injection vector, the owner declined the trade
    // on 2026-08-26. Revisit if user-supplied content ever reaches the DOM unescaped.
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      'https://va.vercel-scripts.com',
      'https://vitals.vercel-insights.com',
    ].join(' ');

    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self' https://accounts.google.com",
      `script-src ${scriptSrc}`,
      // Once UI ships component styles inline, so this one cannot be dropped without
      // restyling the design system.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://accounts.google.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "frame-src https://accounts.google.com",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

module.exports = nextConfig;