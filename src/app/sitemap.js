export default function sitemap() {
  const base = process.env.NEXTAUTH_URL || 'https://district79.school';
  return [
    { url: `${base}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/about`, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
