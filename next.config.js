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
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self' https://accounts.google.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://accounts.google.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "frame-src https://accounts.google.com",
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