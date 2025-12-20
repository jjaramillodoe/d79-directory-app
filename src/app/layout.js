import './globals.css'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Providers } from './providers'
import { Analytics } from "@vercel/analytics/next"

export const metadata = {
  title: 'District 79 - Consolidated School Plan',
  description: 'School plans management system for the 2025-2026 academic year',
  keywords: ['District 79', 'NYC Schools', 'School Plans', 'Education Management', 'NYC Public Schools', '2025-2026 Academic Year'],
  authors: [{ name: 'Javier Jaramillo', url: 'https://district79.schoolplans.nyc' }],
  creator: 'Javier Jaramillo',
  publisher: 'NYC District 79',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://district79.school'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'District 79 - Consolidated School Plan',
    description: 'Comprehensive school plans management system for the 2025-2026 academic year.',
    url: process.env.NEXTAUTH_URL || 'https://district79.school',
    siteName: 'District 79 Directory',
    images: [
      {
        url: '/images/d79logo.png',
        width: 1200,
        height: 630,
        alt: 'District 79 Directory Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'District 79 - Consolidated School Plan',
    description: 'Comprehensive school plans management system for the 2025-2026 academic year.',
    images: ['/images/d79logo.png'],
    creator: '@district79',
    site: '@district79',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add verification codes if you have them
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Analytics />
        <SpeedInsights />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}