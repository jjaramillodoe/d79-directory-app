/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is now stable in Next.js 16
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  // External packages are handled via webpack config below
  // Configure Turbopack (Next.js 16 default) to handle external packages
  turbopack: {
    resolveAlias: {
      '@': require('path').resolve(__dirname, 'src'),
    },
  },
  // Keep webpack config for compatibility (explicitly use webpack for build)
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };
    
    // Externalize pdfkit and related packages for server-side only
    if (isServer) {
      config.externals = config.externals || [];
      // Handle both array and function externals
      if (Array.isArray(config.externals)) {
        config.externals.push('pdfkit', 'iconv-lite');
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = [
          originalExternals,
          (context, request, callback) => {
            if (request === 'pdfkit' || request === 'iconv-lite') {
              return callback(null, `commonjs ${request}`);
            }
            callback();
          }
        ];
      } else {
        config.externals = {
          ...config.externals,
          'pdfkit': 'commonjs pdfkit',
          'iconv-lite': 'commonjs iconv-lite'
        };
      }
    }
    
    return config;
  },
};

module.exports = nextConfig;