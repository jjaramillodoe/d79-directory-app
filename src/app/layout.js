import '@once-ui-system/core/css/styles.css';
import '@once-ui-system/core/css/tokens.css';
import './globals.css'
import './once-ui-scope.css'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Providers } from './providers'
import { Analytics } from "@vercel/analytics/next"
import { ThemeInit } from '@once-ui-system/core';
import { style, dataStyle } from '../resources/once-ui.config';
import ClientErrorReporter from '../components/ClientErrorReporter';
import { APP_NAME, APP_TITLE, APP_DESCRIPTION, ORG_NAME } from '../lib/branding';

export const metadata = {
  title: {
    default: APP_TITLE,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [ORG_NAME, APP_NAME, 'NYC Schools', 'Youth Development', 'Education Management', 'NYC Public Schools'],
  authors: [{ name: 'Javier Jaramillo', url: 'https://district79.schoolplans.nyc' }],
  creator: 'Javier Jaramillo',
  publisher: `NYC ${ORG_NAME}`,
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://district79.school'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    url: process.env.NEXTAUTH_URL || 'https://district79.school',
    siteName: APP_NAME,
    images: [
      {
        url: '/images/d79logo.png',
        width: 1200,
        height: 630,
        alt: `${APP_NAME} logo`,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_TITLE,
    description: APP_DESCRIPTION,
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

// Without this Next.js emits no viewport meta tag, so mobile browsers fall back to a
// ~980px virtual viewport and render the whole app zoomed out. maximumScale is left
// unset deliberately: capping it would block pinch-zoom, which people relying on
// magnification need.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
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
        {/* Outside Providers so it still reports if a provider is what threw. */}
        <ClientErrorReporter />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}