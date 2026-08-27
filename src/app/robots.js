export default function robots() {
  const base = process.env.NEXTAUTH_URL || 'https://district79.school';
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/about'],
      disallow: ['/dashboard', '/admin', '/form', '/login', '/view', '/api', '/unavailable'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
