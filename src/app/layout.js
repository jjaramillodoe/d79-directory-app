import '@once-ui-system/core/css/styles.css';
import '@once-ui-system/core/css/tokens.css';
import './globals.css'
import './once-ui-scope.css'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Providers } from './providers'
import { Analytics } from "@vercel/analytics/next"
import { ThemeInit } from '@once-ui-system/core';
import { style, dataStyle } from '../resources/once-ui.config';

export const metadata = {
  title: 'District 79 - Consolidated School Plan',
  description: 'School plans management system for the 2026-2027 academic year',
  keywords: ['District 79', 'NYC Schools', 'School Plans', 'Education Management', 'NYC Public Schools', '2026-2027 Academic Year'],
  authors: [{ name: 'Javier Jaramillo', url: 'https://district79.schoolplans.nyc' }],
  creator: 'Javier Jaramillo',
  publisher: 'NYC District 79',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://district79.school'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'District 79 - Consolidated School Plan',
    description: 'School plans management system for the 2026-2027 academic year. Copy last year’s answers, compare years, and submit the new plan.',
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
    description: 'School plans management system for the 2026-2027 academic year.',
    images: ['/images/d79logo.png'],
    creator: '@district79',
    site: '@district79',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    // Add verification codes if you have them
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      data-theme={style.theme}
      data-brand={style.brand}
      data-accent={style.accent}
      data-neutral={style.neutral}
      data-solid={style.solid}
      data-solid-style={style.solidStyle}
      data-border={style.border}
      data-surface={style.surface}
      data-transition={style.transition}
      data-scaling={style.scaling}
      data-viz-style={dataStyle.variant}
    >
      <head>
        <Analytics />
        <SpeedInsights />
        <ThemeInit
          config={{
            theme: style.theme,
            brand: style.brand,
            accent: style.accent,
            neutral: style.neutral,
            solid: style.solid,
            'solid-style': style.solidStyle,
            border: style.border,
            surface: style.surface,
            transition: style.transition,
            scaling: style.scaling,
            'viz-style': dataStyle.variant,
          }}
        />
      </head>
      <body style={{ margin: 0 }} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}